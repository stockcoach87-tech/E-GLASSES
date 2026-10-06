export function exportCustomersToExcel(customers) {

    if (!Array.isArray(customers) || !customers.length) {
        alert("There are no records to export.");
        return;
    }

    const rows = customers.map(entry => {

        const date = new Date(entry.created_at);

        return {
            "Customer Name":
                entry.customer_name || "",

            "Mobile Number":
                entry.mobile || "",

            "Gender":
                entry.gender || "",

            "Visit Reason":
                formatReason(entry.visit_reason),

            "Product":
                formatProduct(entry.product_type),

            "Purchase":
                entry.purchase_status === "yes"
                    ? "Yes"
                    : "No",

            "Purchase Details":
                entry.purchase_details || "",

            "Staff":
                entry.profiles?.full_name || "",

            "Staff Mobile":
                entry.profiles?.mobile || "",

            "Date":
                date.toLocaleDateString("en-IN"),

            "Time":
                date.toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
        };
    });


    const worksheet =
        XLSX.utils.json_to_sheet(rows);


    worksheet["!cols"] = [
        { wch: 24 },
        { wch: 16 },
        { wch: 12 },
        { wch: 16 },
        { wch: 18 },
        { wch: 12 },
        { wch: 35 },
        { wch: 22 },
        { wch: 18 },
        { wch: 14 },
        { wch: 12 }
    ];


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Customers"
    );


    const fileDate =
        new Date()
            .toISOString()
            .slice(0, 10);


    XLSX.writeFile(
        workbook,
        `E-Glasses-Customers-${fileDate}.xlsx`
    );
}


function formatReason(reason) {

    const map = {

        shopping: "Shopping",
        eye_test: "Eye Test",
        repair: "Repair",
        pickup: "Pickup"

    };

    return map[reason] || reason || "";
}


function formatProduct(product) {

    const map = {

        glasses: "Glasses",
        sunglasses: "Sun Glasses",
        contact_lens: "Contact Lens"

    };

    return map[product] || product || "";
}
