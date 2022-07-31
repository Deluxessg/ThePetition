const express = require("express");
const path = require("path");
const app = express();

const { engine } = require("express-handlebars");
app.engine("handlebars", engine());
app.set("view engine", "handlebars");

const { createSignature, getSignatures } = require("./db");
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: false }));

app.get("/", (request, response) => {
    response.render("homepage");
});

app.post("/", (request, response) => {
    if (
        !request.body.first_name ||
        !request.body.last_name ||
        !request.body.signature
    ) {
        response.render("homepage", {
            error: `Please fill all the fields`,
        });
        return;
    }
    createSignature(request.body)
        .then(response.redirect("/thankyou"))
        .catch((error) => {
            console.log("error", error);
            response.redirect("/");
        });
});

app.get("/signatures", (request, response) => {
    getSignatures().then((signatures) => {
        response.render("signatures", {
            signatures,
        });
    });
});

app.listen(8080, () => console.log("server is onon local:8080"));
