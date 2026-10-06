import {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
} from "./config.js";

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


let allCustomers = [];
let allStaff = [];


/* -----------------------------
   INITIALIZATION
------------------------------ */

async function initializeAdmin() {

    const {
        data: {
            user
        }
    } = await supabase.auth.getUser();


    if (!user) {

        window.location.href =
            "login.html";

        return;
    }


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
        .eq("id", user.id)
        .single();


    if (
        profileError ||
        !profile ||
        profile.role !== "admin" ||
        !profile.active
    ) {

        await supabase.auth.signOut();

        window.location.href =
            "login.html";

        return;
    }


    document.getElementById(
        "adminName"
    ).textContent =
        profile.full_name || "Admin";


    document.getElementById(
        "currentDate"
    ).textContent =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                dateStyle: "full"
            }
        ).format(
            new Date()
        );


    await Promise.all([
        loadStaff(),
        loadCustomers()
    ]);

    updateDashboardStats();
}


/* -----------------------------
   LOAD STAFF
------------------------------ */

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

        return;
    }


    allStaff =
        data.filter(
            staff =>
                staff.role === "staff"
        );


    const staffFilter =
        document.getElementById(
            "staffFilter"
        );


    staffFilter.innerHTML = `
        <option value="">
            All Staff
        </option>
    `;


    allStaff.forEach(
        staff => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                staff.id;

            option.textContent =
                staff.full_name;

            staffFilter.appendChild(
                option
            );
        }
    );


    renderStaffCards();
}


/* -----------------------------
   LOAD CUSTOMERS
------------------------------ */

async function loadCustomers() {

    setTableStatus(
        "Loading..."
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
            created_at,
            staff_id,
            profiles:staff_id (
                id,
                full_name,
                mobile
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

        setTableStatus(
            "Database error"
        );

        return;
    }


    allCustomers =
        data || [];


    renderCustomers(
        getFilteredCustomers()
    );
}


/* -----------------------------
   FILTERING
------------------------------ */

function getFilteredCustomers() {

    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .trim()
            .toLowerCase();


    const fromDate =
        document.getElementById(
            "fromDate"
        ).value;


    const toDate =
        document.getElementById(
            "toDate"
        ).value;


    const staffId =
        document.getElementById(
            "staffFilter"
        ).value;


    const reason =
        document.getElementById(
            "reasonFilter"
        ).value;


    const purchase =
        document.getElementById(
            "purchaseFilter"
        ).value;


    return allCustomers.filter(
        entry => {

            const customerName =
                (
                    entry.customer_name ||
                    ""
                ).toLowerCase();


            const mobile =
                (
                    entry.mobile ||
                    ""
                ).toLowerCase();


            if (
                search &&
                !customerName.includes(search) &&
                !mobile.includes(search)
            ) {
                return false;
            }


            if (
                staffId &&
                entry.staff_id !== staffId
            ) {
                return false;
            }


            if (
                reason &&
                entry.visit_reason !== reason
            ) {
                return false;
            }


            if (
                purchase &&
                entry.purchase_status !== purchase
            ) {
                return false;
            }


            const entryDate =
                new Date(
                    entry.created_at
                );


            if (fromDate) {

                const start =
                    new Date(
                        `${fromDate}T00:00:00`
                    );


                if (
                    entryDate < start
                ) {
                    return false;
                }
            }


            if (toDate) {

                const end =
                    new Date(
                        `${toDate}T23:59:59`
                    );


                if (
                    entryDate > end
                ) {
                    return false;
                }
            }


            return true;
        }
    );
}


/* -----------------------------
   RENDER CUSTOMERS
------------------------------ */

function renderCustomers(
    customers
) {

    const tbody =
        document.getElementById(
            "customersTableBody"
        );


    const count =
        document.getElementById(
            "resultCount"
        );


    tbody.innerHTML = "";


    count.textContent =
        `${customers.length} records`;


    if (!customers.length) {

        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    No customer records found.
                </td>
            </tr>
        `;

        setTableStatus(
            "No matching records"
        );

        return;
    }


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


            const reason =
                formatReason(
                    entry.visit_reason
                );


            const product =
                formatProduct(
                    entry.product_type
                );


            const staffName =
                entry.profiles?.full_name ||
                "Unknown";


            row.innerHTML = `

                <td>
                    <div class="customer-cell">
                        <strong>
                            ${escapeHTML(
                                entry.customer_name
                            )}
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
                    ${escapeHTML(
                        entry.mobile || "-"
                    )}
                </td>


                <td>
                    ${capitalize(
                        entry.gender || "-"
                    )}
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
                        ${
                            entry.purchase_status === "yes"
                                ? "yes"
                                : "no"
                        }
                    ">

                        ${
                            entry.purchase_status === "yes"
                                ? "Yes"
                                : "No"
                        }

                    </span>

                </td>


                <td>
                    ${escapeHTML(
                        staffName
                    )}
                </td>


                <td>
                    ${date.toLocaleDateString(
                        "en-IN"
                    )}
                </td>


                <td>
                    ${date.toLocaleTimeString(
                        "en-IN",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    )}
                </td>

            `;


            tbody.appendChild(
                row
            );
        }
    );


    setTableStatus(
        `${customers.length} records`
    );
}


/* -----------------------------
   DASHBOARD STATS
------------------------------ */

function updateDashboardStats() {

    const todayStart =
        new Date();

    todayStart.setHours(
        0,
        0,
        0,
        0
    );


    const todayVisits =
        allCustomers.filter(
            entry =>
                new Date(
                    entry.created_at
                ) >= todayStart
        ).length;


    const purchases =
        allCustomers.filter(
            entry =>
                entry.purchase_status ===
                "yes"
        ).length;


    const activeStaff =
        allStaff.filter(
            staff =>
                staff.active
        ).length;


    document.getElementById(
        "totalCustomers"
    ).textContent =
        allCustomers.length;


    document.getElementById(
        "todayVisits"
    ).textContent =
        todayVisits;


    document.getElementById(
        "totalPurchases"
    ).textContent =
        purchases;


    document.getElementById(
        "activeStaff"
    ).textContent =
        activeStaff;
}


/* -----------------------------
   STAFF CARDS
------------------------------ */

function renderStaffCards() {

    const container =
        document.getElementById(
            "staffGrid"
        );


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
                        entry.staff_id === staff.id
                );


            const purchases =
                entries.filter(
                    entry =>
                        entry.purchase_status === "yes"
                ).length;


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "staff-card";


            card.innerHTML = `

                <div class="staff-head">

                    <div class="staff-avatar">

                        ${escapeHTML(
                            (
                                staff.full_name ||
                                "S"
                            )
                            .charAt(0)
                            .toUpperCase()
                        )}

                    </div>


                    <div>

                        <div class="staff-name">
                            ${escapeHTML(
                                staff.full_name
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


/* -----------------------------
   NAVIGATION
------------------------------ */

document
    .querySelectorAll(".nav-item")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    openSection(
                        button.dataset.section
                    );

                    document
                        .querySelectorAll(
                            ".nav-item"
                        )
                        .forEach(
                            item =>
                                item.classList
                                    .remove(
                                        "active"
                                    )
                        );


                    button.classList.add(
                        "active"
                    );


                    closeMobileSidebar();
                }
            );
        }
    );


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
                            item => {

                                item.classList
                                    .toggle(
                                        "active",
                                        item.dataset.section ===
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
            section =>
                section.classList.remove(
                    "active-section"
                )
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


    document.getElementById(
        "pageTitle"
    ).textContent =
        titles[sectionId] ||
        "Dashboard";
}


/* -----------------------------
   FILTER EVENTS
------------------------------ */

document
    .getElementById(
        "applyFiltersBtn"
    )
    .addEventListener(
        "click",
        () => {

            renderCustomers(
                getFilteredCustomers()
            );
        }
    );


document
    .getElementById(
        "resetFiltersBtn"
    )
    .addEventListener(
        "click",
        () => {

            document.getElementById(
                "searchInput"
            ).value = "";


            document.getElementById(
                "fromDate"
            ).value = "";


            document.getElementById(
                "toDate"
            ).value = "";


            document.getElementById(
                "staffFilter"
            ).value = "";


            document.getElementById(
                "reasonFilter"
            ).value = "";


            document.getElementById(
                "purchaseFilter"
            ).value = "";


            renderCustomers(
                allCustomers
            );
        }
    );


document
    .getElementById(
        "searchInput"
    )
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                renderCustomers(
                    getFilteredCustomers()
                );
            }
        }
    );


/* -----------------------------
   EXCEL EXPORT
------------------------------ */

document
    .getElementById(
        "exportCustomersBtn"
    )
    .addEventListener(
        "click",
        exportExcel
    );


document
    .getElementById(
        "reportExportBtn"
    )
    .addEventListener(
        "click",
        exportExcel
    );


function exportExcel() {

    const customers =
        getFilteredCustomers();


    if (!customers.length) {

        alert(
            "There are no records to export."
        );

        return;
    }


    const rows =
        customers.map(
            entry => {

                const date =
                    new Date(
                        entry.created_at
                    );


                return {

                    "Customer Name":
                        entry.customer_name,

                    "Mobile Number":
                        entry.mobile,

                    "Gender":
                        entry.gender,

                    "Visit Reason":
                        formatReason(
                            entry.visit_reason
                        ),

                    "Product":
                        formatProduct(
                            entry.product_type
                        ),

                    "Purchase":
                        entry.purchase_status === "yes"
                            ? "Yes"
                            : "No",

                    "Purchase Details":
                        entry.purchase_details || "",

                    "Staff":
                        entry.profiles?.full_name ||
                        "",

                    "Staff Mobile":
                        entry.profiles?.mobile ||
                        "",

                    "Date":
                        date.toLocaleDateString(
                            "en-IN"
                        ),

                    "Time":
                        date.toLocaleTimeString(
                            "en-IN",
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        )

                };
            }
        );


    const worksheet =
        XLSX.utils.json_to_sheet(
            rows
        );


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Customers"
    );


    XLSX.writeFile(
        workbook,
        `E-Glasses-Customers-${formatFileDate()}.xlsx`
    );
}


/* -----------------------------
   MOBILE SIDEBAR
------------------------------ */

document
    .getElementById(
        "menuToggle"
    )
    .addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "sidebar"
                )
                .classList.toggle(
                    "open"
                );
        }
    );


function closeMobileSidebar() {

    document
        .getElementById(
            "sidebar"
        )
        .classList.remove(
            "open"
        );
}


/* -----------------------------
   LOGOUT
------------------------------ */

document
    .getElementById(
        "logoutBtn"
    )
    .addEventListener(
        "click",
        async () => {

            await supabase.auth.signOut();

            window.location.href =
                "login.html";
        }
    );


/* -----------------------------
   HELPERS
------------------------------ */

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
        "-"
    );
}


function capitalize(
    value
) {

    if (!value) {
        return "-";
    }


    return value
        .charAt(0)
        .toUpperCase() +
        value.slice(1);
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


function setTableStatus(
    text
) {

    const element =
        document.getElementById(
            "tableStatus"
        );


    if (element) {
        element.textContent =
            text;
    }
}


function formatFileDate() {

    const now =
        new Date();


    return now
        .toISOString()
        .slice(
            0,
            10
        );
}


/* -----------------------------
   START
------------------------------ */

initializeAdmin();
