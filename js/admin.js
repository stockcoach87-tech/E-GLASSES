import {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
} from "./config.js";

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    exportCustomersToExcel
} from "./excel.js";


/* =========================================================
   SUPABASE
========================================================= */

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;

let allCustomers = [];
let allStaff = [];


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (id) =>
    document.getElementById(id);


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeAdmin() {

    try {

        setStatus(
            "tableStatus",
            "Checking account..."
        );


        /*
         * Get currently logged-in user
         */

        const {
            data: userData,
            error: userError
        } = await supabase.auth.getUser();


        if (userError) {
            throw userError;
        }


        currentUser =
            userData?.user || null;


        /*
         * No login
         */

        if (!currentUser) {

            redirectToLogin();

            return;
        }


        /*
         * Load profile
         */

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select(`
                id,
                full_name,
                mobile,
                role,
                active
            `)
            .eq(
                "id",
                currentUser.id
            )
            .single();


        if (profileError) {
            throw profileError;
        }


        currentProfile = profile;


        /*
         * Security check
         */

        if (
            !currentProfile ||
            currentProfile.role !== "admin" ||
            currentProfile.active !== true
        ) {

            await supabase.auth.signOut();

            alert(
                "You do not have permission to access the admin panel."
            );

            redirectToLogin();

            return;
        }


        /*
         * Update admin identity
         */

        updateAdminIdentity();


        /*
         * Load application data
         */

        await Promise.all([
            loadStaff(),
            loadCustomers()
        ]);


        /*
         * Update dashboard
         */

        updateDashboardStats();


        /*
         * Render customer table
         */

        renderCustomers(
            getFilteredCustomers()
        );


        /*
         * Current date
         */

        updateCurrentDate();


        setStatus(
            "tableStatus",
            `${allCustomers.length} records`
        );


    } catch (error) {

        console.error(
            "Admin initialization error:",
            error
        );


        setStatus(
            "tableStatus",
            "Unable to load data"
        );


        alert(
            getErrorMessage(error)
        );
    }
}


/* =========================================================
   ADMIN PROFILE UI
========================================================= */

function updateAdminIdentity() {

    const adminName =
        $("adminName");

    if (adminName) {

        adminName.textContent =
            currentProfile?.full_name ||
            "Administrator";
    }


    const avatar =
        document.querySelector(
            ".admin-avatar"
        );


    if (
        avatar &&
        currentProfile?.full_name
    ) {

        avatar.textContent =
            getInitial(
                currentProfile.full_name
            );
    }
}


function updateCurrentDate() {

    const element =
        $("currentDate");


    if (!element) {
        return;
    }


    element.textContent =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                dateStyle: "full"
            }
        ).format(
            new Date()
        );
}


/* =========================================================
   LOAD STAFF
========================================================= */

async function loadStaff() {

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select(`
            id,
            full_name,
            mobile,
            role,
            active
        `)
        .eq(
            "role",
            "staff"
        )
        .order(
            "full_name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Staff loading error:",
            error
        );

        throw error;
    }


    allStaff =
        Array.isArray(data)
            ? data
            : [];


    populateStaffFilter();

    renderStaffCards();
}


/* =========================================================
   STAFF FILTER
========================================================= */

function populateStaffFilter() {

    const select =
        $("staffFilter");


    if (!select) {
        return;
    }


    select.innerHTML = "";


    const allOption =
        document.createElement(
            "option"
        );


    allOption.value = "";

    allOption.textContent =
        "All Staff";


    select.appendChild(
        allOption
    );


    allStaff.forEach(
        staff => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                staff.id;


            option.textContent =
                staff.full_name ||
                "Unnamed Staff";


            select.appendChild(
                option
            );
        }
    );
}


/* =========================================================
   LOAD CUSTOMERS
========================================================= */

async function loadCustomers() {

    setStatus(
        "tableStatus",
        "Loading customers..."
    );


    const {
        data,
        error
    } = await supabase
        .from("customer_entries")
        .select(`
            id,
            customer_name,
            mobile,
            gender,
            visit_reason,
            product_type,
            purchase_status,
            purchase_details,
            staff_id,
            created_at,
            profiles:staff_id (
                id,
                full_name,
                mobile,
                role
            )
        `)
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Customer loading error:",
            error
        );

        throw error;
    }


    allCustomers =
        Array.isArray(data)
            ? data
            : [];
}


/* =========================================================
   FILTER CUSTOMERS
========================================================= */

function getFilteredCustomers() {

    const search =
        (
            $("searchInput")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const fromDate =
        $("fromDate")?.value || "";


    const toDate =
        $("toDate")?.value || "";


    const staffId =
        $("staffFilter")?.value || "";


    const reason =
        $("reasonFilter")?.value || "";


    const purchase =
        $("purchaseFilter")?.value || "";


    return allCustomers.filter(
        entry => {


            /*
             * Search
             */

            if (search) {

                const customerName =
                    String(
                        entry.customer_name || ""
                    ).toLowerCase();


                const mobile =
                    String(
                        entry.mobile || ""
                    ).toLowerCase();


                const purchaseDetails =
                    String(
                        entry.purchase_details || ""
                    ).toLowerCase();


                const matchesSearch =
                    customerName.includes(search) ||
                    mobile.includes(search) ||
                    purchaseDetails.includes(search);


                if (!matchesSearch) {
                    return false;
                }
            }


            /*
             * Staff
             */

            if (
                staffId &&
                entry.staff_id !== staffId
            ) {

                return false;
            }


            /*
             * Visit reason
             */

            if (
                reason &&
                entry.visit_reason !== reason
            ) {

                return false;
            }


            /*
             * Purchase
             */

            if (
                purchase &&
                entry.purchase_status !== purchase
            ) {

                return false;
            }


            /*
             * Date
             */

            const entryTime =
                new Date(
                    entry.created_at
                ).getTime();


            if (
                Number.isNaN(entryTime)
            ) {

                return false;
            }


            /*
             * From date
             */

            if (fromDate) {

                const fromTime =
                    new Date(
                        `${fromDate}T00:00:00`
                    ).getTime();


                if (
                    entryTime < fromTime
                ) {

                    return false;
                }
            }


            /*
             * To date
             */

            if (toDate) {

                const toTime =
                    new Date(
                        `${toDate}T23:59:59.999`
                    ).getTime();


                if (
                    entryTime > toTime
                ) {

                    return false;
                }
            }


            return true;
        }
    );
}


/* =========================================================
   RENDER CUSTOMER TABLE
========================================================= */

function renderCustomers(
    customers
) {

    const tbody =
        $("customersTableBody");


    const resultCount =
        $("resultCount");


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (resultCount) {

        resultCount.textContent =
            `${customers.length} records`;
    }


    /*
     * Empty state
     */

    if (!customers.length) {

        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    No customer records found.
                </td>
            </tr>
        `;


        setStatus(
            "tableStatus",
            "No matching records"
        );


        return;
    }


    /*
     * Rows
     */

    customers.forEach(
        entry => {

            const row =
                document.createElement(
                    "tr"
                );


            const date =
                new Date(
                    entry.created_at
                );


            const staff =
                entry.profiles || null;


            const customerName =
                escapeHTML(
                    entry.customer_name ||
                    "Unknown Customer"
                );


            const mobile =
                escapeHTML(
                    entry.mobile ||
                    "-"
                );


            const gender =
                escapeHTML(
                    capitalize(
                        entry.gender ||
                        "-"
                    )
                );


            const reason =
                escapeHTML(
                    formatReason(
                        entry.visit_reason
                    )
                );


            const product =
                escapeHTML(
                    formatProduct(
                        entry.product_type
                    )
                );


            const staffName =
                escapeHTML(
                    staff?.full_name ||
                    "Unknown"
                );


            const purchase =
                entry.purchase_status ===
                "yes";


            row.innerHTML = `

                <td>

                    <div class="customer-cell">

                        <strong>
                            ${customerName}
                        </strong>

                        <span>
                            ${escapeHTML(
                                entry.purchase_details ||
                                "Customer record"
                            )}
                        </span>

                    </div>

                </td>


                <td>
                    ${mobile}
                </td>


                <td>
                    ${gender}
                </td>


                <td>
                    ${reason}
                </td>


                <td>
                    ${product}
                </td>


                <td>

                    <span class="
                        badge
                        ${purchase ? "yes" : "no"}
                    ">

                        ${
                            purchase
                                ? "Yes"
                                : "No"
                        }

                    </span>

                </td>


                <td>
                    ${staffName}
                </td>


                <td>
                    ${formatDate(date)}
                </td>


                <td>
                    ${formatTime(date)}
                </td>

            `;


            tbody.appendChild(
                row
            );
        }
    );


    setStatus(
        "tableStatus",
        `${customers.length} records`
    );
}


/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateDashboardStats() {

    /*
     * Total
     */

    const totalCustomers =
        allCustomers.length;


    /*
     * Today's start
     */

    const now =
        new Date();


    const startOfToday =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
            0
        );


    const endOfToday =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999
        );


    /*
     * Today's visits
     */

    const todayVisits =
        allCustomers.filter(
            entry => {

                const date =
                    new Date(
                        entry.created_at
                    );


                return (
                    date >= startOfToday &&
                    date <= endOfToday
                );
            }
        ).length;


    /*
     * Purchases
     */

    const purchases =
        allCustomers.filter(
            entry =>
                entry.purchase_status ===
                "yes"
        ).length;


    /*
     * Active staff
     */

    const activeStaff =
        allStaff.filter(
            staff =>
                staff.active === true
        ).length;


    /*
     * Update UI
     */

    setText(
        "totalCustomers",
        totalCustomers
    );


    setText(
        "todayVisits",
        todayVisits
    );


    setText(
        "totalPurchases",
        purchases
    );


    setText(
        "activeStaff",
        activeStaff
    );
}


/* =========================================================
   STAFF CARDS
========================================================= */

function renderStaffCards() {

    const container =
        $("staffGrid");


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!allStaff.length) {

        container.innerHTML = `
            <div class="loading-card">
                No staff accounts found.
            </div>
        `;

        return;
    }


    allStaff.forEach(
        staff => {

            const entries =
                allCustomers.filter(
                    entry =>
                        entry.staff_id ===
                        staff.id
                );


            const purchases =
                entries.filter(
                    entry =>
                        entry.purchase_status ===
                        "yes"
                ).length;


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "staff-card";


            const initial =
                getInitial(
                    staff.full_name ||
                    "Staff"
                );


            card.innerHTML = `

                <div class="staff-head">


                    <div class="staff-avatar">
                        ${escapeHTML(initial)}
                    </div>


                    <div>

                        <div class="staff-name">

                            ${escapeHTML(
                                staff.full_name ||
                                "Unnamed Staff"
                            )}

                        </div>


                        <div class="staff-mobile">

                            ${escapeHTML(
                                staff.mobile ||
                                "No mobile number"
                            )}

                        </div>

                    </div>


                    <div class="staff-status">

                        ${
                            staff.active
                                ? "ACTIVE"
                                : "INACTIVE"
                        }

                    </div>


                </div>


                <div class="staff-stats">


                    <div class="staff-stat">

                        <span>
                            Total Entries
                        </span>

                        <strong>
                            ${entries.length}
                        </strong>

                    </div>


                    <div class="staff-stat">

                        <span>
                            Purchases
                        </span>

                        <strong>
                            ${purchases}
                        </strong>

                    </div>


                </div>

            `;


            container.appendChild(
                card
            );
        }
    );
}


/* =========================================================
   SIDEBAR NAVIGATION
========================================================= */

document
    .querySelectorAll(".nav-item")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const sectionId =
                        button.dataset.section;


                    openSection(
                        sectionId
                    );


                    document
                        .querySelectorAll(
                            ".nav-item"
                        )
                        .forEach(
                            navItem => {

                                navItem.classList.toggle(
                                    "active",
                                    navItem === button
                                );
                            }
                        );


                    closeMobileSidebar();
                }
            );
        }
    );


/* =========================================================
   QUICK ACTION NAVIGATION
========================================================= */

document
    .querySelectorAll(".quick-card")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        button.dataset.target;


                    openSection(
                        target
                    );


                    document
                        .querySelectorAll(
                            ".nav-item"
                        )
                        .forEach(
                            navItem => {

                                navItem.classList.toggle(
                                    "active",
                                    navItem.dataset.section ===
                                        target
                                );
                            }
                        );
                }
            );
        }
    );


function openSection(
    sectionId
) {

    document
        .querySelectorAll(
            ".content-section"
        )
        .forEach(
            section => {

                section.classList.remove(
                    "active-section"
                );
            }
        );


    const section =
        document.getElementById(
            sectionId
        );


    if (section) {

        section.classList.add(
            "active-section"
        );
    }


    const titles = {

        dashboardSection:
            "Dashboard",

        customersSection:
            "Customers",

        staffSection:
            "Staff Management",

        reportsSection:
            "Reports"

    };


    const pageTitle =
        $("pageTitle");


    if (pageTitle) {

        pageTitle.textContent =
            titles[sectionId] ||
            "Dashboard";
    }
}


/* =========================================================
   FILTER BUTTON
========================================================= */

$("applyFiltersBtn")
    ?.addEventListener(
        "click",
        () => {

            const filtered =
                getFilteredCustomers();


            renderCustomers(
                filtered
            );
        }
    );


/* =========================================================
   RESET FILTERS
========================================================= */

$("resetFiltersBtn")
    ?.addEventListener(
        "click",
        () => {

            if ($("searchInput")) {
                $("searchInput").value = "";
            }


            if ($("fromDate")) {
                $("fromDate").value = "";
            }


            if ($("toDate")) {
                $("toDate").value = "";
            }


            if ($("staffFilter")) {
                $("staffFilter").value = "";
            }


            if ($("reasonFilter")) {
                $("reasonFilter").value = "";
            }


            if ($("purchaseFilter")) {
                $("purchaseFilter").value = "";
            }


            renderCustomers(
                allCustomers
            );
        }
    );


/* =========================================================
   LIVE SEARCH
========================================================= */

$("searchInput")
    ?.addEventListener(
        "input",
        () => {

            renderCustomers(
                getFilteredCustomers()
            );
        }
    );


/* =========================================================
   DATE / SELECT FILTER EVENTS
========================================================= */

[
    "fromDate",
    "toDate",
    "staffFilter",
    "reasonFilter",
    "purchaseFilter"
]
.forEach(
    id => {

        $(id)?.addEventListener(
            "change",
            () => {

                renderCustomers(
                    getFilteredCustomers()
                );
            }
        );
    }
);


/* =========================================================
   EXCEL EXPORT
========================================================= */

$("exportCustomersBtn")
    ?.addEventListener(
        "click",
        exportCurrentResults
    );


$("reportExportBtn")
    ?.addEventListener(
        "click",
        exportCurrentResults
    );


function exportCurrentResults() {

    const filteredCustomers =
        getFilteredCustomers();


    exportCustomersToExcel(
        filteredCustomers
    );
}


/* =========================================================
   MOBILE MENU
========================================================= */

$("menuToggle")
    ?.addEventListener(
        "click",
        () => {

            $("sidebar")
                ?.classList.toggle(
                    "open"
                );
        }
    );


function closeMobileSidebar() {

    $("sidebar")
        ?.classList.remove(
            "open"
        );
}


/* =========================================================
   LOGOUT
========================================================= */

$("logoutBtn")
    ?.addEventListener(
        "click",
        async () => {

            try {

                await supabase.auth.signOut();

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );
            }


            redirectToLogin();
        }
    );


/* =========================================================
   AUTH STATE
========================================================= */

supabase.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        if (
            event === "SIGNED_OUT" ||
            !session
        ) {

            if (
                !window.location.pathname
                    .endsWith(
                        "login.html"
                    )
            ) {

                redirectToLogin();
            }
        }
    }
);


/* =========================================================
   HELPERS
========================================================= */

function formatReason(
    reason
) {

    const map = {

        shopping:
            "Shopping",

        eye_test:
            "Eye Test",

        repair:
            "Repair",

        pickup:
            "Pickup"

    };


    return (
        map[reason] ||
        reason ||
        "-"
    );
}


function formatProduct(
    product
) {

    const map = {

        glasses:
            "Glasses",

        sunglasses:
            "Sun Glasses",

        contact_lens:
            "Contact Lens"

    };


    return (
        map[product] ||
        product ||
        "-"
    );
}


function formatDate(
    date
) {

    if (
        !(date instanceof Date) ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleDateString(
        "en-IN"
    );
}


function formatTime(
    date
) {

    if (
        !(date instanceof Date) ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function capitalize(
    value
) {

    if (!value) {
        return "-";
    }


    const text =
        String(value);


    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


function getInitial(
    name
) {

    const text =
        String(name || "").trim();


    return (
        text.charAt(0).toUpperCase() ||
        "A"
    );
}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function setText(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            String(value);
    }
}


function setStatus(
    id,
    text
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            text;
    }
}


function getErrorMessage(
    error
) {

    if (
        error &&
        typeof error.message === "string"
    ) {

        return error.message;
    }


    return (
        "Something went wrong while loading the admin panel."
    );
}


function redirectToLogin() {

    window.location.href =
        "login.html";
}


/* =========================================================
   START ADMIN APP
========================================================= */

initializeAdmin();
