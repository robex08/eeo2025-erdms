require('dotenv').config();

console.log('1. Loading db connection...');
require('./src/db/connection');

console.log('2. Loading auth routes...');
const authRoutes = require('./src/routes/auth');

console.log('3. Auth routes loaded successfully!', typeof authRoutes);
console.log('4. Routes object:', authRoutes);
