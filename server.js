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
    getUserInfo,
    updateUser,
    upsertProfile,
    deleteSignature,
    getSignatureByUserId,
} = require("./db");
// const { SESSION_SECRET } = require("./secrets.json");

let sessionSecret;

if (process.env.NODE_ENV == "production") {
    sessionSecret = process.env.SESSION_SECRET;
} else {
    sessionSecret = require("./secrets").SESSION_SECRET;
}

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(
    cookieSession({
        secret: sessionSecret,
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
            getSignatureByUserId(foundUser.id).then((signature) => {
                request.session.user_id = foundUser.id;
                request.session.signatureId = signature.id;
                console.log("SIGNATURE", signature);
                response.redirect("/thankyou");
            });
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
    if (request.session.signatureId) {
        response.redirect("/thankyou");

        return;
    }
    createSignature({
        user_id: request.session.user_id,
        signature: request.body.signature,
    })
        .then((newSignature) => {
            console.log("NEWSIGN", newSignature);
            request.session.signatureId = newSignature.id;
            console.log("signID in homePOST", request.session.signatureId);
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
    console.log("signID", request.session.signatureId);
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
        response.render("signaturesByCity", {
            city: request.params.city,
            signatures,
        });
    });
});

app.post("/unsign", (request, response) => {
    request.session.signatureId = null;
    deleteSignature(request.session.user_id);
    response.redirect("/");
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
    getSignatureByUserId(request.session.user_id).then((signature) => {
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

// #6 edit

app.post("/profile/edit", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/login");
        return;
    }
    Promise.all([
        updateUser({ user_id: request.session.user_id, ...request.body }),
        upsertProfile({ user_id: request.session.user_id, ...request.body }),
    ])
        .then(() => {
            response.redirect("/");
        })
        .catch((error) => {
            console.log("edit error", error);
            response
                .status(500)
                .render("editProfile", { error: "Something went wrong" });
        });
});

app.get("/profile/edit", (request, response) => {
    if (!request.session.user_id) {
        response.redirect("/login");
        return;
    }

    getUserInfo(request.session.user_id).then((info) => {
        response.render("edit", { ...info });
    });
});

// #7 logout

app.post("/logout", (request, response) => {
    request.session = null;
    response.redirect("/login");
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on http://localhost:${port}`));

// app.listen(8080, () => console.log("server is onon local:8080"));
