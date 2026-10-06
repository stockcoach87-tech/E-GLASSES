const CACHE_NAME =
    "e-glasses-v1";

const APP_SHELL = [

    "/",
    "/index.html",
    "/login.html",
    "/staff.html",
    "/admin.html",
    "/privacy.html",

    "/css/style.css",
    "/css/login.css",

    "/js/config.js",
    "/js/auth.js",
    "/js/staff.js",
    "/js/admin.js",
    "/js/whatsapp.js",
    "/js/main.js",

    "/manifest.json",

    "/assets/logo.png",
    "/assets/icon-192.png",
    "/assets/icon-512.png"

];


self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(cache =>
                    cache.addAll(APP_SHELL)
                )

        );

        self.skipWaiting();
    }
);


self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(keys =>

                    Promise.all(
                        keys
                            .filter(
                                key =>
                                    key !== CACHE_NAME
                            )
                            .map(
                                key =>
                                    caches.delete(key)
                            )
                    )

                )

        );

        self.clients.claim();
    }
);


self.addEventListener(
    "fetch",
    event => {

        if (
            event.request.method !==
            "GET"
        ) {
            return;
        }


        event.respondWith(

            fetch(event.request)
                .then(response => {

                    const copy =
                        response.clone();

                    caches
                        .open(CACHE_NAME)
                        .then(cache => {

                            cache.put(
                                event.request,
                                copy
                            );

                        });

                    return response;

                })
                .catch(() =>

                    caches.match(
                        event.request
                    )

                )

        );
    }
);
