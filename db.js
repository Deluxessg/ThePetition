const spicedPg = require("spiced-pg");
const bcrypt = require("bcryptjs");

// const { DATABASE_USER, DATABASE_PASSWORD } = require("./secrets.json");
const DATABASE_NAME = "petition";
const DATABASE_PASSWORD = "postgres";
const DATABASE_USER = "postgres";

const db = spicedPg(
    `postgres:${DATABASE_USER}:${DATABASE_PASSWORD}@localhost:5432/${DATABASE_NAME}`
);
const hash = (password) =>
    bcrypt.genSalt().then((salt) => bcrypt.hash(password, salt));

function createSignature({ signature, user_id }) {
    return db
        .query(
            ` 
        INSERT INTO signatures (signature, user_id)
            VALUES ($1, $2)
            RETURNING *
        `,
            [signature, user_id]
        )
        .then((result) => result.rows[0]);
}

function getSignatures() {
    return db.query("SELECT * FROM signatures").then((result) => result.rows);
}

function getSignatureById(id) {
    return db
        .query("SELECT * FROM signatures WHERE id =$1", [id])
        .then((result) => result.rows[0]);
}

function createUser({ first_name, last_name, email, password }) {
    return hash(password).then((password_hash) => {
        return db
            .query(
                `
            INSERT INTO users (first_name, last_name, email, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `,
                [first_name, last_name, email, password_hash]
            )
            .then((result) => result.rows[0]);
    });
}

function getUserByEmail(email) {
    return db
        .query(`SELECT * FROM users WHERE email =$1`, [email])
        .then((result) => result.rows[0]);
}

function login({ email, password }) {
    return getUserByEmail(email).then((foundUser) => {
        if (!foundUser) {
            return null;
        }
        return bcrypt
            .compare(password, foundUser.password_hash)
            .then((match) => {
                if (match) {
                    return foundUser;
                }
                return null;
            });
    });
}

module.exports = {
    createSignature,
    getSignatures,
    getSignatureById,
    createUser,
    getUserByEmail,
    login,
};
