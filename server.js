require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
// Make sure the uploads folder exists
if (!fs.existsSync('uploads/receipts')) {
    fs.mkdirSync('uploads/receipts', { recursive: true });
}

// Configure where uploaded receipts get saved
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/receipts'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage: storage });


const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.get('/api/courses', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query('SELECT * FROM Courses');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching courses');
    }
});
app.post('/api/enroll', upload.single('receipt'), async (req, res) => {
    const { courseName, fullName, organizationName, phoneNumber, email } = req.body;
    const receiptFileName = req.file ? req.file.filename : null;

    if (!courseName || !fullName || !phoneNumber || !email) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('CourseName', sql.NVarChar, courseName)
            .input('FullName', sql.NVarChar, fullName)
            .input('OrganizationName', sql.NVarChar, organizationName || '')
            .input('PhoneNumber', sql.NVarChar, phoneNumber)
            .input('Email', sql.NVarChar, email)
            .input('ReceiptFileName', sql.NVarChar, receiptFileName)
            .query('INSERT INTO Enrollments (CourseName, FullName, OrganizationName, PhoneNumber, Email, ReceiptFileName) VALUES (@CourseName, @FullName, @OrganizationName, @PhoneNumber, @Email, @ReceiptFileName)');

        res.status(201).json({ success: true, message: 'Enrollment submitted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving enrollment' });
    }
});

app.post('/api/inquiries', async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Email', sql.NVarChar, email)
            .input('Phone', sql.NVarChar, phone || '')
            .input('Message', sql.NVarChar, message || '')
            .query('INSERT INTO Inquiries (Name, Email, Phone, Message) VALUES (@Name, @Email, @Phone, @Message)');

        res.status(201).json({ success: true, message: 'Inquiry saved successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving inquiry' });
    }
}); 



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
