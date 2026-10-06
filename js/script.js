document.addEventListener("DOMContentLoaded", async () => {

    /* =====================================
       ELEMENTS
    ===================================== */

    const sidebar =
        document.getElementById("sidebar");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");

    const menuButton =
        document.getElementById("menuButton");

    const logoutButton =
        document.getElementById("logoutButton");

    const navItems =
        document.querySelectorAll(".nav-item");

    const sectionButtons =
        document.querySelectorAll("[data-section]");

    const pageTitle =
        document.getElementById("pageTitle");

    const pageEyebrow =
        document.getElementById("pageEyebrow");

    const topbarDate =
        document.getElementById("topbarDate");

    const adminName =
        document.getElementById("adminName");

    const adminAvatar =
        document.getElementById("adminAvatar");

    const welcomeName =
        document.getElementById("welcomeName");


    /* =====================================
       STATS
    ===================================== */

    const totalCustomers =
        document.getElementById("totalCustomers");

    const todayCustomers =
        document.getElementById("todayCustomers");

    const activeStaff =
        document.getElementById("activeStaff");

    const shoppingCustomers =
        document.getElementById("shoppingCustomers");


    const recentCustomers =
        document.getElementById("recentCustomers");


    /* =====================================
       SECTION TITLES
    ===================================== */

    const sectionTitles = {

        dashboard: {
            title: "Dashboard",
            eyebrow: "ADMIN OVERVIEW"
        },

        customers: {
            title: "Customers",
            eyebrow: "CUSTOMER MANAGEMENT"
        },

        "new-customer": {
            title: "New Customer",
            eyebrow: "CUSTOMER ENTRY"
        },

        today: {
            title: "Today's Entries",
            eyebrow: "TODAY"
        },

        staff: {
            title: "Staff Management",
            eyebrow: "TEAM MANAGEMENT"
        },

        reports: {
            title: "Reports",
            eyebrow: "REPORTING"
        },

        export: {
            title: "Excel Export",
            eyebrow: "DATA EXPORT"
        },

        audit: {
            title: "Audit History",
            eyebrow: "SECURITY"
        }

    };


    /* =====================================
       DATE
    ===================================== */

    function updateDate() {

        const now = new Date();

        topbarDate.textContent =
            now.toLocaleDateString(
                "en-IN",
                {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );
    }


    updateDate();


    /* =====================================
       SIDEBAR
    ===================================== */

    function openSidebar() {

        sidebar.classList.add(
            "sidebar-open"
        );

        sidebarOverlay.classList.add(
            "visible"
        );
    }


    function closeSidebar() {

        sidebar.classList.remove(
            "sidebar-open"
        );

        sidebarOverlay.classList.remove(
            "visible"
        );
    }


    menuButton.addEventListener(
        "click",
        openSidebar
    );


    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );


    /* =====================================
       SECTION NAVIGATION
    ===================================== */

    function showSection(sectionName) {

        const sections =
            document.querySelectorAll(
                ".page-section"
            );


        sections.forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });


        const target =
            document.getElementById(
                `${sectionName}Section`
            );


        if (target) {

            target.classList.add(
                "active-section"
            );
        }


        navItems.forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.section === sectionName
            );

        });


        const info =
            sectionTitles[sectionName];


        if (info) {

            pageTitle.textContent =
                info.title;

            pageEyebrow.textContent =
                info.eyebrow;
        }


        closeSidebar();
    }


    sectionButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const section =
                    button.dataset.section;

                if (section) {
                    showSection(section);
                }

            }
        );

    });


    /* =====================================
       AUTHENTICATION CHECK
    ===================================== */

    async function checkAdminAccess() {

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if (sessionError) {

            console.error(
                sessionError
            );

            redirectToLogin();

            return null;
        }


        const session =
            sessionData.session;


        if (!session) {

            redirectToLogin();

            return null;
        }


        /* Fetch current staff profile */

        const {
            data: profile,
            error: profileError
        } =
            await supabaseClient
                .from("staff")
                .select(
                    "id, name, mobile, role, is_active"
                )
                .eq(
                    "id",
                    session.user.id
                )
                .maybeSingle();


        if (
            profileError ||
            !profile
        ) {

            await supabaseClient.auth.signOut();

            redirectToLogin();

            return null;
        }


        if (
            profile.role !== "admin" ||
            !profile.is_active
        ) {

            await supabaseClient.auth.signOut();

            redirectToLogin();

            return null;
        }


        return profile;
    }


    function redirectToLogin() {

        window.location.href =
            "index.html";
    }


    /* =====================================
       ADMIN PROFILE
    ===================================== */

    function renderAdminProfile(profile) {

        const name =
            profile.name ||
            "Admin";


        adminName.textContent =
            name;


        welcomeName.textContent =
            name;


        adminAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();
    }


    /* =====================================
       INDIA DATE HELPERS
    ===================================== */

    function getIndiaDateString() {

        return new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).format(
            new Date()
        );
    }


    function getIndiaDayRange() {

        const date =
            getIndiaDateString();


        return {
            start:
                `${date}T00:00:00+05:30`,

            end:
                `${date}T23:59:59.999+05:30`
        };
    }


    /* =====================================
       LOAD DASHBOARD
    ===================================== */

    async function loadDashboard() {

        try {

            /* -----------------------------
               TOTAL CUSTOMERS
            ----------------------------- */

            const {
                count: totalCount,
                error: totalError
            } =
                await supabaseClient
                    .from("customers")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    );


            if (totalError) {
                throw totalError;
            }


            totalCustomers.textContent =
                totalCount ?? 0;


            /* -----------------------------
               TODAY
            ----------------------------- */

            const {
                start,
                end
            } =
                getIndiaDayRange();


            const {
                count: todayCount,
                error: todayError
            } =
                await supabaseClient
                    .from("customers")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .gte(
                        "created_at",
                        start
                    )
                    .lte(
                        "created_at",
                        end
                    );


            if (todayError) {
                throw todayError;
            }


            todayCustomers.textContent =
                todayCount ?? 0;


            /* -----------------------------
               ACTIVE STAFF
            ----------------------------- */

            const {
                count: activeCount,
                error: activeError
            } =
                await supabaseClient
                    .from("staff")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .eq(
                        "is_active",
                        true
                    );


            if (activeError) {
                throw activeError;
            }


            activeStaff.textContent =
                activeCount ?? 0;


            /* -----------------------------
               SHOPPING
            ----------------------------- */

            const {
                count: shoppingCount,
                error: shoppingError
            } =
                await supabaseClient
                    .from("customers")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .eq(
                        "reason",
                        "shopping"
                    );


            if (shoppingError) {
                throw shoppingError;
            }


            shoppingCustomers.textContent =
                shoppingCount ?? 0;


            /* -----------------------------
               RECENT CUSTOMERS
            ----------------------------- */

            await loadRecentCustomers();


        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );


            totalCustomers.textContent = "—";
            todayCustomers.textContent = "—";
            activeStaff.textContent = "—";
            shoppingCustomers.textContent = "—";


            recentCustomers.innerHTML = `
                <div class="no-data">
                    Unable to load dashboard data.
                </div>
            `;
        }
    }


    /* =====================================
       RECENT CUSTOMERS
    ===================================== */

    async function loadRecentCustomers() {

        recentCustomers.innerHTML = `
            <div class="loading-state">
                Loading customers...
            </div>
        `;


        const {
            data,
            error
        } =
            await supabaseClient
                .from("customers")
                .select(`
                    id,
                    name,
                    mobile,
                    gender,
                    reason,
                    shopping_type,
                    created_at,
                    created_by
                `)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(8);


        if (error) {
            throw error;
        }


        if (
            !data ||
            data.length === 0
        ) {

            recentCustomers.innerHTML = `
                <div class="no-data">
                    No customer records found.
                </div>
            `;

            return;
        }


        let rows = "";


        data.forEach(customer => {

            const date =
                new Date(
                    customer.created_at
                );


            const formattedDate =
                date.toLocaleDateString(
                    "en-IN",
                    {
                        day: "2-digit",
                        month: "short"
                    }
                );


            const formattedTime =
                date.toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );


            let reason =
                customer.reason || "—";


            reason =
                reason.replace(
                    "_",
                    " "
                );


            reason =
                reason.charAt(0).toUpperCase()
                +
                reason.slice(1);


            if (
                customer.shopping_type
            ) {

                const type =
                    customer.shopping_type
                        .replaceAll(
                            "_",
                            " "
                        );


                reason +=
                    ` · ${capitalizeWords(type)}`;
            }


            rows += `
                <tr>

                    <td>
                        <span class="customer-name">
                            ${escapeHtml(customer.name)}
                        </span>
                    </td>

                    <td>
                        <span class="customer-mobile">
                            ${escapeHtml(customer.mobile)}
                        </span>
                    </td>

                    <td>
                        <span class="reason-badge">
                            ${escapeHtml(reason)}
                        </span>
                    </td>

                    <td>
                        ${formattedDate}
                        <br>
                        <span class="customer-mobile">
                            ${formattedTime}
                        </span>
                    </td>

                </tr>
            `;
        });


        recentCustomers.innerHTML = `
            <table class="customer-table">

                <thead>

                    <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Visit Reason</th>
                        <th>Created</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>
        `;
    }


    /* =====================================
       UTILITIES
    ===================================== */

    function capitalizeWords(value) {

        return value
            .split(" ")
            .map(word => {

                return word.charAt(0)
                    .toUpperCase()
                    +
                    word.slice(1);

            })
            .join(" ");
    }


    function escapeHtml(value) {

        if (value === null ||
            value === undefined) {

            return "";
        }


        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    /* =====================================
       LOGOUT
    ===================================== */

    logoutButton.addEventListener(
        "click",
        async () => {

            logoutButton.disabled = true;

            logoutButton.textContent =
                "Logging out...";


            const {
                error
            } =
                await supabaseClient.auth.signOut();


            if (error) {

                console.error(
                    "Logout error:",
                    error
                );

                logoutButton.disabled = false;

                logoutButton.textContent =
                    "Logout";

                return;
            }


            window.location.href =
                "index.html";
        }
    );


    /* =====================================
       START
    ===================================== */

    const adminProfile =
        await checkAdminAccess();


    if (!adminProfile) {
        return;
    }


    renderAdminProfile(
        adminProfile
    );


    await loadDashboard();

});
