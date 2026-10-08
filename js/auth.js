import {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
} from "./config.js";

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


export const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


let selectedRole = null;


/* =========================================================
   ELEMENTS
========================================================= */

const roleSelection =
    document.getElementById(
        "roleSelection"
    );

const loginSection =
    document.getElementById(
        "loginSection"
    );

const selectedRoleName =
    document.getElementById(
        "selectedRoleName"
    );

const selectedRoleIcon =
    document.getElementById(
        "selectedRoleIcon"
    );

const loginForm =
    document.getElementById(
        "loginForm"
    );

const loginError =
    document.getElementById(
        "loginError"
    );


/* =========================================================
   ROLE BUTTONS
========================================================= */

document
    .querySelectorAll(".role-option")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    selectedRole =
                        button.dataset.role;

                    showLoginForm();

                }
            );

        }
    );


/* =========================================================
   SHOW LOGIN
========================================================= */

function showLoginForm() {

    roleSelection.classList.add(
        "hidden"
    );

    loginSection.classList.remove(
        "hidden"
    );


    if (
        selectedRole === "admin"
    ) {

        selectedRoleName.textContent =
            "Admin";

        selectedRoleIcon.textContent =
            "A";


        selectedRoleIcon.style.color =
            "#8b7cff";

        selectedRoleIcon.style.background =
            "rgba(139,124,255,.14)";

    }


    if (
        selectedRole === "staff"
    ) {

        selectedRoleName.textContent =
            "Staff";

        selectedRoleIcon.textContent =
            "S";


        selectedRoleIcon.style.color =
            "#5ee7df";

        selectedRoleIcon.style.background =
            "rgba(94,231,223,.11)";

    }


    document
        .getElementById("email")
        ?.focus();

}


/* =========================================================
   BACK BUTTON
========================================================= */

document
    .getElementById("backToRoles")
    ?.addEventListener(
        "click",
        () => {

            selectedRole =
                null;

            loginSection.classList.add(
                "hidden"
            );

            roleSelection.classList.remove(
                "hidden"
            );


            if (loginError) {
                loginError.textContent = "";
            }


            if (loginForm) {
                loginForm.reset();
            }

        }
    );


/* =========================================================
   LOGIN
========================================================= */

loginForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!selectedRole) {

            showError(
                "Please select your login type."
            );

            return;
        }


        const email =
            document
                .getElementById("email")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value;


        if (
            !email ||
            !password
        ) {

            showError(
                "Please enter your email and password."
            );

            return;
        }


        const button =
            document.getElementById(
                "signInButton"
            );


        button.disabled =
            true;

        button.textContent =
            "Signing in...";


        try {


            const {
                data,
                error
            } =
                await supabase.auth
                    .signInWithPassword({

                        email,
                        password

                    });


            if (error) {
                throw error;
            }


            const {
                data: profile,
                error: profileError
            } =
                await supabase
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
                        data.user.id
                    )
                    .single();


            if (profileError) {
                throw profileError;
            }


            if (!profile) {

                throw new Error(
                    "Your account profile was not found."
                );
            }


            if (
                profile.active !== true
            ) {

                await supabase.auth
                    .signOut();

                throw new Error(
                    "This account is inactive."
                );
            }


            if (
                profile.role !== selectedRole
            ) {

                await supabase.auth
                    .signOut();

                throw new Error(
                    `This account is not a ${selectedRole} account.`
                );
            }


            /* -------------------------------------------
               REDIRECT
            -------------------------------------------- */

            if (
                profile.role === "admin"
            ) {

                window.location.href =
                    "admin.html";

                return;
            }


            if (
                profile.role === "staff"
            ) {

                window.location.href =
                    "staff.html";

                return;
            }


            await supabase.auth
                .signOut();

            throw new Error(
                "Unknown account role."
            );


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            showError(
                error.message ||
                "Unable to sign in."
            );


        } finally {

            button.disabled =
                false;

            button.textContent =
                "Sign In";

        }

    }
);


/* =========================================================
   ERROR
========================================================= */

function showError(
    message
) {

    if (loginError) {

        loginError.textContent =
            message;
    }

}
