import {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
} from "./config.js";

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value;

            const errorElement =
                document.getElementById("loginError");

            errorElement.textContent = "";

            const {
                data,
                error
            } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {

                errorElement.textContent =
                    error.message;

                return;
            }

            const {
                data: profile
            } = await supabase
                .from("profiles")
                .select("role, active")
                .eq("id", data.user.id)
                .single();

            if (!profile || !profile.active) {

                await supabase.auth.signOut();

                errorElement.textContent =
                    "Your account is inactive.";

                return;
            }

            if (profile.role === "admin") {

                window.location.href =
                    "admin.html";

            } else {

                window.location.href =
                    "staff.html";
            }
        }
    );
}
