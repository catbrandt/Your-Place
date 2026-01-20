// Create and export a PostgreSQL connection pool
const {Pool} = require ('pg')

// Create a new pool using DATABASE_URL from .env
const pool = new Pool ({
    connectionstring: process.env.DATABASE_URL,
})

module.exports = pool