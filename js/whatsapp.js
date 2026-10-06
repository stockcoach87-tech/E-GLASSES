export function openWhatsApp(
    mobile,
    customerName
) {

    let number =
        mobile.replace(/\D/g, "");

    if (number.length === 10) {
        number = "91" + number;
    }

    const message =
`Hello ${customerName},

Thank you for visiting E-Glasses.

We truly appreciate your time and trust.

We look forward to welcoming you again and helping you find the perfect eyewear.

Thank you for choosing E-Glasses.
Have a wonderful day!`;

    const url =
        `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}
