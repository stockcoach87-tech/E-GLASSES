import {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
} from "./config.js";

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    openWhatsApp
} from "./whatsapp.js";


const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


let currentUser = null;
let currentReason = null;
let currentProduct = null;


const serviceSelection =
    document.getElementById(
        "serviceSelection"
    );

const productSelection =
    document.getElementById(
        "productSelection"
    );

const customerFormSection =
    document.getElementById(
        "customerFormSection"
    );


async function initialize() {

    const {
        data
    } = await supabase.auth.getUser();

    if (!data.user) {

        window.location.href =
            "login.html";

        return;
    }

    currentUser = data.user;

    const {
        data: profile
    } = await supabase
        .from("profiles")
        .select("full_name, role, active")
        .eq("id", currentUser.id)
        .single();

    if (
        !profile ||
        !profile.active ||
        profile.role !== "staff"
    ) {

        await supabase.auth.signOut();

        window.location.href =
            "login.html";

        return;
    }

    document.getElementById(
        "staffName"
    ).textContent =
        profile.full_name;

    document.getElementById(
        "todayDate"
    ).textContent =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                dateStyle: "full"
            }
        ).format(new Date());

    await loadTodayEntries();
}


document
    .querySelectorAll(".service-card")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentReason =
                    button.dataset.reason;

                if (
                    currentReason ===
                    "shopping"
                ) {

                    serviceSelection
                        .classList
                        .add("hidden");

                    productSelection
                        .classList
                        .remove("hidden");

                } else {

                    currentProduct = null;

                    serviceSelection
                        .classList
                        .add("hidden");

                    customerFormSection
                        .classList
                        .remove("hidden");
                }
            }
        );
    });


document
    .querySelectorAll(".product-card")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentProduct =
                    button.dataset.product;

                productSelection
                    .classList
                    .add("hidden");

                customerFormSection
                    .classList
                    .remove("hidden");
            }
        );
    });


document
    .getElementById("backToServices")
    .addEventListener(
        "click",
        () => {

            productSelection
                .classList
                .add("hidden");

            serviceSelection
                .classList
                .remove("hidden");
        }
    );


document
    .getElementById("backToPrevious")
    .addEventListener(
        "click",
        () => {

            customerFormSection
                .classList
                .add("hidden");

            if (
                currentReason ===
                "shopping"
            ) {

                productSelection
                    .classList
                    .remove("hidden");

            } else {

                serviceSelection
                    .classList
                    .remove("hidden");
            }
        }
    );


document
    .getElementById("customerForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const customerName =
                document
                    .getElementById(
                        "customerName"
                    )
                    .value
                    .trim();

            const mobile =
                document
                    .getElementById(
                        "mobile"
                    )
                    .value
                    .trim();

            const gender =
                document
                    .getElementById(
                        "gender"
                    )
                    .value;

            const purchaseStatus =
                document
                    .getElementById(
                        "purchaseStatus"
                    )
                    .value;

            const purchaseDetails =
                document
                    .getElementById(
                        "purchaseDetails"
                    )
                    .value
                    .trim();


            const {
                error
            } = await supabase
                .from("customer_entries")
                .insert({

                    customer_name:
                        customerName,

                    mobile,

                    gender,

                    visit_reason:
                        currentReason,

                    product_type:
                        currentProduct,

                    purchase_status:
                        purchaseStatus,

                    purchase_details:
                        purchaseDetails || null,

                    staff_id:
                        currentUser.id
                });


            if (error) {

                alert(error.message);

                return;
            }


            openWhatsApp(
                mobile,
                customerName
            );


            event.target.reset();

            currentReason = null;
            currentProduct = null;


            customerFormSection
                .classList
                .add("hidden");

            serviceSelection
                .classList
                .remove("hidden");


            await loadTodayEntries();
        }
    );


async function loadTodayEntries() {

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
            created_at
        `)
        .eq(
            "staff_id",
            currentUser.id
        )
        .gte(
            "created_at",
            new Date(
                new Date()
                    .setHours(0, 0, 0, 0)
            ).toISOString()
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        return;
    }


    const container =
        document.getElementById(
            "todayEntries"
        );

    container.innerHTML = "";


    if (!data.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No customers yet</h3>
                <p>
                    Today's customer entries
                    will appear here.
                </p>
            </div>
        `;

        return;
    }


    data.forEach(entry => {

        const card =
            document.createElement(
                "article"
            );

        card.className =
            "customer-card";


        const time =
            new Date(
                entry.created_at
            ).toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );


        card.innerHTML = `

            <div class="customer-main">

                <div class="customer-avatar">
                    ${entry.customer_name
                        .charAt(0)
                        .toUpperCase()}
                </div>

                <div>

                    <h3>
                        ${escapeHTML(
                            entry.customer_name
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            entry.mobile
                        )}
                    </p>

                </div>

            </div>


            <div class="customer-meta">

                <span>
                    ${formatReason(
                        entry.visit_reason
                    )}
                </span>

                ${
                    entry.product_type
                    ?
                    `<span>
                        ${formatProduct(
                            entry.product_type
                        )}
                    </span>`
                    :
                    ""
                }

                <span>
                    ${time}
                </span>

            </div>


            <button
                class="whatsapp-btn"
                data-mobile="${escapeHTML(
                    entry.mobile
                )}"
                data-name="${escapeHTML(
                    entry.customer_name
                )}"
            >
                WhatsApp
            </button>

        `;


        card
            .querySelector(
                ".whatsapp-btn"
            )
            .addEventListener(
                "click",
                () => {

                    openWhatsApp(
                        entry.mobile,
                        entry.customer_name
                    );
                }
            );


        container.appendChild(card);
    });
}


function formatReason(reason) {

    const map = {

        shopping: "Shopping",
        eye_test: "Eye Test",
        repair: "Repair",
        pickup: "Pickup"

    };

    return map[reason] || reason;
}


function formatProduct(product) {

    const map = {

        glasses: "Glasses",
        sunglasses: "Sun Glasses",
        contact_lens: "Contact Lens"

    };

    return map[product] || product;
}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        async () => {

            await supabase.auth.signOut();

            window.location.href =
                "login.html";
        }
    );


initialize();
