const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const path = require('path');
const pool = require('./db');
const { sendEmail } = require('./mail-sender');
const fs = require('fs');
const app = express();
const PORT = 3000;

let emailProgress = {
  total: 0,
  sent: 0
};

require('dotenv').config();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('public/uploads'));

// Halaman utama
app.get('/', (req, res) => {
    res.render('index');
});

// Upload form
app.post('/upload', upload.array('attachments'), async (req, res) => {
  const emailData = JSON.parse(req.body.emailData);
  const files = req.files;

  const emails = emailData.map(data => {
    const file = files.find(f => f.originalname.split('.')[0] === data.name);
    if (!file) {
      console.warn(`❗ Tidak ada file cocok untuk '${data.name}'`);
      return { ...data, attachment: null, filename: null };
    }

    const extension = path.extname(file.originalname);
    const finalPath = `${file.path}${extension}`;
    fs.renameSync(file.path, finalPath);

    return {
      name: data.name,
      email: data.email,
      attachment: finalPath,
      filename: file.originalname,
    };
  });

  for (const email of emails) {
    if (email.attachment) {
      await pool.query(
        'INSERT INTO emails (name, email, attachment) VALUES (?, ?, ?)',
        [email.name, email.email, email.attachment]
      );
      console.log('✅ Disimpan:', email.name, email.attachment);
    } else {
      console.warn(`⚠️ SKIP: ${email.name} tidak punya attachment.`);
    }
  }

  res.render('preview', { emails });
});


// Kirim email
app.post('/send-emails', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM emails');

  emailProgress.total = rows.length;
  emailProgress.sent = 0;

  // Tampilkan halaman progress segera
  res.render('progress');

  // Proses email di background
  for (const row of rows) {
    try {
      await sendEmail(row.email, 'Test Email', 'Email ini dikirim otomatis dari aplikasi', row.attachment);
      emailProgress.sent++;
      // Optional: hapus lampiran setelah dikirim
      fs.unlinkSync(row.attachment);
    } catch (err) {
      console.error(`Gagal kirim ke ${row.email}`, err.message);
    }
  }

  // Kosongkan tabel setelah selesai
  //await pool.query('DELETE FROM emails');
});

app.get('/progress', (req, res) => {
  res.json(emailProgress);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));