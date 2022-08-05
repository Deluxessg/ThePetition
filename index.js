const express = require("express");
const path = require("path");
const app = express();
const cookieSession = require("cookie-session");

const { engine } = require("express-handlebars");
app.engine("handlebars", engine());
app.set("view engine", "handlebars");

const {
    createSignature,
    getSignatures,
    getSignatureById,
    createUser,
    getUserByEmail,
    login,
    createUserProfile,
    getSignaturesByCity,
} = require("./db");
const { response } = require("express");
const { createSecureServer } = require("http2");
const { request } = require("http");
const { SESSION_SECRET } = require("./secrets.json");
const { isGeneratorFunction } = require("util/types");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(
    cookieSession({
        secret: SESSION_SECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);
app.use((request, response, next) => {
    response.setHeader("X-Frame-Options", "DENY");
    next();
});

// #1 register
app.post("/register", (request, response) => {
    if (
        !request.body.first_name ||
        !request.body.last_name ||
        !request.body.email ||
        !request.body.password
    ) {
        response.render("register", {
            error: "Fill all fields!",
        });
        return;
    }
    createUser(request.body)
        .then((newUser) => {
            request.session.user_id = newUser.id;
            response.redirect("/profile");
        })
        .catch((error) => {
            console.log("error", error);

            if (error.constraint === "user_email_key") {
                response.statusCode(400).render("register", {
                    error: "email already registered",
                });
                return;
            }
            response.status(500).render("register", {
                error: "Please try again",
            });
        });
});

app.get("/register", (request, response) => {
    if (request.session.user_id) {
        response.redirect("/");
        return;
    }
    response.render("register");
});

// #2 login

app.post("/login", (request, response) => {
    login(request.body)
        .then((foundUser) => {
            if (!foundUser) {
                response.render("login", {
                    error: "email and password not matching",
                });
                return;
            }
            request.session.user_id = foundUser.id;
            response.redirect("/");
        })
        .catch((error) => {
            response.status(500).render("register", {
                error: "",
            });
        });
});

app.get("/login", (request, response) => {
    response.render("login");
});

// #3 signature

app.post("/", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/login");
        return;
    }
    if (!request.body.signature) {
        response.render("homepage", {
            error: "Please provide a signature!",
        });
        return;
    }
    createSignature({
        user_id: request.session.user_id,
        signature: request.body.signature,
    })
        .then((newSignature) => {
            request.session.signatureId = newSignature.id;
            response.redirect("/thankyou");
        })
        .catch((error) => {
            console.log("POST", error);
            response.redirect("/");
        });
});

app.get("/signatures", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/login");
        return;
    }
    if (!request.session.signatureId) {
        response.redirect("/");
        return;
    }
    getSignatures().then((signatures) => {
        response.render("signatures", { signatures });
    });
});

app.get("/", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/register");
        return;
    }
    if (request.session.signatureId) {
        response.redirect("/thankyou");
        return;
    }
    response.render("homepage");
});

app.get("/signatures/:city", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/login");
        return;
    }
    if (!request.session.signatureId) {
        response.redirect("/");
        return;
    }
    getSignaturesByCity(request.params.city).then((signatures) => {
        response.render.apply("signaturesByCity", {
            city: request.params.city,
            signatures,
        });
    });
});

// #4 thankyou

app.get("/thankyou", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/login");
        return;
    }
    if (!request.session.signatureId) {
        response.redirect("/");
        return;
    }
    getSignatureById(request.session.user_id).then((signature) => {
        response.render("thankyou", { signature });
    });
});

// #5 profile

app.post("/profile", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/login");
        return;
    }
    createUserProfile({ user_id: request.session.user_id, ...request.body })
        .then(response.redirect("/"))
        .catch((error) => {
            console.log("profile error", error);
            response.render("profile", { error: "Fill all the fields" });
        });
});

app.get("/profile", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/login");
        return;
    }
    response.render("profile");
});

app.listen(8080, () => console.log("server is onon local:8080"));
