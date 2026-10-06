let deferredInstallPrompt = null;

const installButton =
    document.getElementById(
        "installAppBtn"
    );


window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredInstallPrompt =
            event;

        if (installButton) {

            installButton.hidden =
                false;
        }
    }
);


if (installButton) {

    installButton.addEventListener(
        "click",
        async () => {

            if (!deferredInstallPrompt) {
                return;
            }

            await deferredInstallPrompt.prompt();

            const result =
                await deferredInstallPrompt.userChoice;

            deferredInstallPrompt =
                null;

            installButton.hidden =
                true;

            console.log(
                "Install result:",
                result.outcome
            );
        }
    );
}


window.addEventListener(
    "appinstalled",
    () => {

        deferredInstallPrompt =
            null;

        if (installButton) {
            installButton.hidden =
                true;
        }
    }
);


if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("/sw.js")
                .then(
                    registration => {

                        console.log(
                            "Service Worker registered:",
                            registration.scope
                        );

                    }
                )
                .catch(
                    error => {

                        console.error(
                            "Service Worker error:",
                            error
                        );

                    }
                );
        }
    );
}
