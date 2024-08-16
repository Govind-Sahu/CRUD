const express = require('express');
const axios = require('axios');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
app.use(express.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database');
});

// FreshSales CRM API Setup
const freshsales = axios.create({
    baseURL: `https://${process.env.FRESHSALES_DOMAIN}.freshsales.io/api/`,
    headers: {
        Authorization: `Token token=${process.env.FRESHSALES_API_KEY}`,
        'Content-Type': 'application/json',
    },
});

// 1. Create Contact
app.post('/createContact', async (req, res) => {
    const { first_name, last_name, email, mobile_number, data_store } = req.body;

    if (data_store === 'CRM') {
        try {
            const response = await freshsales.post('contacts', {
                contact: { first_name, last_name, email, mobile_number },
            });
            res.status(201).json(response.data.contact);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (data_store === 'DATABASE') {
        const sql = 'INSERT INTO Contacts (first_name, last_name, email, mobile_number) VALUES (?, ?, ?, ?)';
        db.query(sql, [first_name, last_name, email, mobile_number], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: result.insertId, first_name, last_name, email, mobile_number });
        });
    } else {
        res.status(400).json({ error: 'Invalid data_store value' });
    }
});

// 2. Get Contact
app.post('/getContact', async (req, res) => {
    const { contact_id, data_store } = req.body;

    if (data_store === 'CRM') {
        try {
            const response = await freshsales.get(`contacts/${contact_id}`);
            res.json(response.data.contact);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (data_store === 'DATABASE') {
        const sql = 'SELECT * FROM Contacts WHERE id = ?';
        db.query(sql, [contact_id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (result.length === 0) {
                return res.status(404).json({ error: 'Contact not found' });
            }
            res.json(result[0]);
        });
    } else {
        res.status(400).json({ error: 'Invalid data_store value' });
    }
});

// 3. Update Contact
app.post('/updateContact', async (req, res) => {
    const { contact_id, new_email, new_mobile_number, data_store } = req.body;

    if (data_store === 'CRM') {
        try {
            const response = await freshsales.put(`contacts/${contact_id}`, {
                contact: { email: new_email, mobile_number: new_mobile_number },
            });
            res.json(response.data.contact);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (data_store === 'DATABASE') {
        const sql = 'UPDATE Contacts SET email = ?, mobile_number = ? WHERE id = ?';
        db.query(sql, [new_email, new_mobile_number, contact_id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Contact not found' });
            }
            res.json({ message: 'Contact updated successfully' });
        });
    } else {
        res.status(400).json({ error: 'Invalid data_store value' });
    }
});

// 4. Delete Contact
app.post('/deleteContact', async (req, res) => {
    const { contact_id, data_store } = req.body;

    if (data_store === 'CRM') {
        try {
            await freshsales.delete(`contacts/${contact_id}`);
            res.json({ message: 'Contact deleted successfully from CRM' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (data_store === 'DATABASE') {
        const sql = 'DELETE FROM Contacts WHERE id = ?';
        db.query(sql, [contact_id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Contact not found' });
            }
            res.json({ message: 'Contact deleted successfully from Database' });
        });
    } else {
        res.status(400).json({ error: 'Invalid data_store value' });
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
