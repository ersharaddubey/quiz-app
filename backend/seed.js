/**
 * Full seed — node seed.js  OR  npm run seed
 * Seeds: Admin, Categories (India govt exams), Subjects, Syllabus, Banners, Sample Questions
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Subject = require('./models/Subject');
const Syllabus = require('./models/Syllabus');
const Banner = require('./models/Banner');
const Admin = require('./models/Admin');
const Question = require('./models/Question');

const categoriesData = [
  { name: 'UPSC', description: 'CSE, IFS, IES, CAPF, EPFO, CDS (written)', icon: '🇮🇳', order: 1 },
  { name: 'SSC', description: 'CGL, CHSL, MTS, GD, CPO, JE, Stenographer', icon: '🏛️', order: 2 },
  { name: 'Banking', description: 'IBPS PO/Clerk/SO, SBI PO/Clerk, RBI Grade B, RRB', icon: '🏦', order: 3 },
  { name: 'Railways', description: 'RRB NTPC, Group D, ALP, JE, Technician', icon: '🚂', order: 4 },
  { name: 'Defence', description: 'NDA, CDS, AFCAT, Agniveer, INET', icon: '🛡️', order: 5 },
  { name: 'Teaching', description: 'CTET, State TET, KVS, NVS, UGC NET, REET', icon: '👨‍🏫', order: 6 },
  { name: 'State PSC', description: 'UPPSC, BPSC, MPSC, RPSC, MPPSC, WBCS, GPSC', icon: '📋', order: 7 },
  { name: 'Police', description: 'SI, Constable, CAPF, Delhi Police, State Police', icon: '👮', order: 8 },
  { name: 'Insurance', description: 'LIC AAO/ADO, NIACL, UIIC, OICL, GIC', icon: '📄', order: 9 },
  { name: 'PSU & Others', description: 'FCI, EPFO, ESIC, ISRO, DRDO, BARC, SAIL', icon: '🏭', order: 10 },
  { name: 'Judicial', description: 'State Judicial Services, Law Officer', icon: '⚖️', order: 11 },
  { name: 'Engineering', description: 'GATE, ESE/IES, SSC JE, RRB JE, State AE/JE', icon: '⚙️', order: 12 },
  { name: 'Medical', description: 'NEET PG prep MCQ, AIIMS, ESIC MO related GA', icon: '🩺', order: 13 },
  { name: 'Agriculture', description: 'IBPS AFO, NABARD, State Agri Officer', icon: '🌾', order: 14 },
];

const commonSubjects = [
  { name: 'Quantitative Aptitude', icon: '🔢', order: 1 },
  { name: 'Reasoning Ability', icon: '🧠', order: 2 },
  { name: 'English Language', icon: '📝', order: 3 },
  { name: 'General Awareness', icon: '🌍', order: 4 },
  { name: 'General Knowledge', icon: '💡', order: 5 },
  { name: 'Current Affairs', icon: '📰', order: 6 },
  { name: 'Computer Awareness', icon: '💻', order: 7 },
  { name: 'General Science', icon: '🔬', order: 8 },
  { name: 'History', icon: '📜', order: 9 },
  { name: 'Geography', icon: '🗺️', order: 10 },
  { name: 'Polity', icon: '⚖️', order: 11 },
  { name: 'Economy', icon: '📈', order: 12 },
];

const bannersData = [
  { title: 'SSC CGL 2026', subtitle: 'Tier-I & Tier-II latest pattern practice', order: 1 },
  { title: 'Banking Exams', subtitle: 'IBPS · SBI PO & Clerk full coverage', order: 2 },
  { title: 'Railway RRB', subtitle: 'NTPC · Group D · ALP · JE', order: 3 },
  { title: 'UPSC Prelims', subtitle: 'GS Paper I & CSAT practice sets', order: 4 },
  { title: 'Defence Forces', subtitle: 'NDA · CDS · AFCAT · Agniveer', order: 5 },
  { title: 'State PSC', subtitle: 'UPPSC · BPSC · MPSC · RPSC', order: 6 },
];

const syllabusMap = {
  'Quantitative Aptitude': [
    { title: 'Number System', topics: ['LCM', 'HCF', 'Fractions', 'Simplification', 'Surds'] },
    { title: 'Percentage & Ratio', topics: ['Percentage', 'Ratio', 'Partnership', 'Allegation'] },
    { title: 'Profit & Interest', topics: ['Profit Loss', 'SI', 'CI', 'Discount'] },
    { title: 'Time Speed Work', topics: ['Time Work', 'Speed Distance', 'Boats', 'Pipes'] },
    { title: 'Data Interpretation', topics: ['Tables', 'Bar Graph', 'Pie Chart', 'Line Graph'] },
  ],
  'Reasoning Ability': [
    { title: 'Verbal Reasoning', topics: ['Analogy', 'Series', 'Coding-Decoding', 'Direction'] },
    { title: 'Logical Reasoning', topics: ['Syllogism', 'Blood Relation', 'Seating', 'Puzzle'] },
    { title: 'Non-Verbal', topics: ['Figure Series', 'Mirror Image', 'Paper Folding'] },
  ],
  'English Language': [
    { title: 'Grammar', topics: ['Tenses', 'Articles', 'Voice', 'Narration', 'Error Spotting'] },
    { title: 'Vocabulary', topics: ['Synonyms', 'Antonyms', 'Idioms', 'One Word'] },
    { title: 'Comprehension', topics: ['RC', 'Cloze Test', 'Para Jumbles'] },
  ],
  'Polity': [
    { title: 'Constitution', topics: ['Preamble', 'FR', 'DPSP', 'Amendments'] },
    { title: 'Governance', topics: ['Parliament', 'Judiciary', 'President', 'PM & Council'] },
  ],
  'History': [
    { title: 'Ancient India', topics: ['Indus Valley', 'Vedic', 'Maurya', 'Gupta'] },
    { title: 'Medieval India', topics: ['Delhi Sultanate', 'Mughals', 'Bhakti'] },
    { title: 'Modern India', topics: ['1857', 'Congress', 'Gandhi Era', 'Independence'] },
  ],
  'Geography': [
    { title: 'Physical', topics: ['Landforms', 'Climate', 'Rivers', 'Soils'] },
    { title: 'Indian Geography', topics: ['States', 'Resources', 'Agriculture', 'Industry'] },
  ],
  'Economy': [
    { title: 'Basics', topics: ['GDP', 'Inflation', 'Fiscal', 'Monetary'] },
    { title: 'Indian Economy', topics: ['Budget', 'Banking', 'Schemes', 'Trade'] },
  ],
  'General Science': [
    { title: 'Physics', topics: ['Motion', 'Light', 'Electricity', 'Sound'] },
    { title: 'Chemistry', topics: ['Atoms', 'Acids Bases', 'Metals', 'Carbon'] },
    { title: 'Biology', topics: ['Cell', 'Human Body', 'Diseases', 'Ecology'] },
  ],
};

const questionBank = {
  'Quantitative Aptitude': [
    { question: 'What is 25% of 480?', options: ['100', '120', '140', '160'], correctAnswer: 1, difficulty: 'Easy', explanation: '25% of 480 = 120' },
    { question: 'If A:B = 3:5 and B:C = 2:3, then A:C is?', options: ['2:5', '3:5', '2:3', '3:10'], correctAnswer: 0, difficulty: 'Medium', explanation: 'A:B:C = 6:10:15 → A:C = 2:5' },
    { question: 'A train 120 m long passes a 180 m platform in 20 s. Speed is?', options: ['45 km/h', '54 km/h', '60 km/h', '72 km/h'], correctAnswer: 1, difficulty: 'Medium', explanation: '300m in 20s = 15 m/s = 54 km/h' },
    { question: 'SI on Rs.2000 at 5% p.a. for 3 years is?', options: ['Rs.200', 'Rs.250', 'Rs.300', 'Rs.350'], correctAnswer: 2, difficulty: 'Easy', explanation: 'SI = PRT/100 = 300' },
    { question: 'Average of 5 numbers is 20. One excluded, average becomes 18. Excluded number?', options: ['26', '28', '30', '32'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Sum 100 − 72 = 28' },
    { question: 'LCM of 12, 18 and 24 is?', options: ['36', '48', '72', '96'], correctAnswer: 2, difficulty: 'Easy', explanation: 'LCM = 72' },
    { question: 'A shopkeeper marks 40% above cost and gives 10% discount. Profit %?', options: ['26%', '30%', '24%', '28%'], correctAnswer: 0, difficulty: 'Medium', explanation: '1.4 × 0.9 = 1.26 → 26%' },
    { question: 'Compound interest on Rs.10000 at 10% for 2 years is?', options: ['Rs.2000', 'Rs.2100', 'Rs.2200', 'Rs.2500'], correctAnswer: 1, difficulty: 'Easy', explanation: '10000×(1.1)² − 10000 = 2100' },
    { question: 'If 15 men complete work in 20 days, 20 men will complete in?', options: ['12 days', '15 days', '18 days', '10 days'], correctAnswer: 1, difficulty: 'Easy', explanation: '15×20 = 20×d → d=15' },
    { question: 'Square root of 0.09 is?', options: ['0.3', '0.03', '0.003', '3'], correctAnswer: 0, difficulty: 'Easy', explanation: '√0.09 = 0.3' },
    { question: 'The HCF of two numbers is 12 and their LCM is 72. If one number is 24, other is?', options: ['36', '48', '30', '42'], correctAnswer: 0, difficulty: 'Medium', explanation: 'HCF×LCM = a×b → 12×72 = 24×b → b=36' },
    { question: 'A sum becomes Rs.2420 in 2 years at 10% CI. Principal is?', options: ['Rs.2000', 'Rs.2100', 'Rs.2200', 'Rs.1800'], correctAnswer: 0, difficulty: 'Medium', explanation: 'P(1.1)² = 2420 → P = 2000' },
  ],
  'Reasoning Ability': [
    { question: 'Find the odd one: 3, 5, 7, 9, 11', options: ['3', '5', '9', '11'], correctAnswer: 2, difficulty: 'Easy', explanation: '9 is not prime' },
    { question: 'If APPLE is coded as BQQMF, ORANGE is?', options: ['PSBOHF', 'PSBOFG', 'PSBNHF', 'PQBOHF'], correctAnswer: 0, difficulty: 'Medium', explanation: 'Each letter +1' },
    { question: 'In a row of 40 students, A is 12th from left. Rank from right?', options: ['28', '29', '27', '30'], correctAnswer: 1, difficulty: 'Easy', explanation: '40−12+1 = 29' },
    { question: 'Which is different: Circle, Triangle, Rectangle, Sphere', options: ['Circle', 'Triangle', 'Rectangle', 'Sphere'], correctAnswer: 3, difficulty: 'Easy', explanation: 'Sphere is 3D' },
    { question: 'Complete series: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '46'], correctAnswer: 1, difficulty: 'Medium', explanation: '+4,+6,+8,+10,+12 → 42' },
    { question: 'A is brother of B. C is mother of A. D is father of C. How is B related to D?', options: ['Grandson/Granddaughter', 'Son', 'Nephew', 'Uncle'], correctAnswer: 0, difficulty: 'Medium', explanation: 'D is maternal grandfather' },
    { question: 'Statements: All cats are dogs. Some dogs are birds. Conclusion: Some cats are birds?', options: ['Yes', 'No', 'Cannot say', 'None'], correctAnswer: 2, difficulty: 'Medium', explanation: 'No definite relation' },
    { question: 'In coding, 2 is written as 5, 3 as 10, 4 as 17. How is 5 written?', options: ['24', '26', '25', '27'], correctAnswer: 1, difficulty: 'Medium', explanation: 'n²+1 → 25+1=26' },
  ],
  'English Language': [
    { question: 'Synonym of Abundant is?', options: ['Scarce', 'Plentiful', 'Rare', 'Limited'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Abundant = plentiful' },
    { question: 'Antonym of Benevolent is?', options: ['Kind', 'Malevolent', 'Generous', 'Friendly'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Benevolent opposite is malevolent' },
    { question: 'Choose correct: She ___ to school every day.', options: ['go', 'goes', 'going', 'gone'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Third person singular → goes' },
    { question: 'One word: A person who loves books', options: ['Bibliophile', 'Philosopher', 'Historian', 'Scholar'], correctAnswer: 0, difficulty: 'Medium', explanation: 'Bibliophile' },
    { question: 'Idiom "Break the ice" means?', options: ['To shatter glass', 'To start conversation', 'To freeze', 'To end friendship'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Start a conversation' },
    { question: 'Passive of: He writes a letter.', options: ['A letter is written by him', 'A letter was written', 'A letter wrote him', 'A letter writes'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Present simple passive' },
    { question: 'Fill: The news ___ shocking.', options: ['are', 'is', 'were', 'have'], correctAnswer: 1, difficulty: 'Easy', explanation: 'News is singular' },
    { question: 'Error spot: He is senior than me.', options: ['is', 'senior', 'than', 'No error'], correctAnswer: 2, difficulty: 'Medium', explanation: 'senior to (not than)' },
  ],
  'General Awareness': [
    { question: 'Who is known as the Father of the Indian Constitution?', options: ['Mahatma Gandhi', 'B.R. Ambedkar', 'Jawaharlal Nehru', 'Rajendra Prasad'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Dr. B.R. Ambedkar' },
    { question: 'The Reserve Bank of India was established in?', options: ['1935', '1947', '1950', '1921'], correctAnswer: 0, difficulty: 'Easy', explanation: 'RBI founded 1 April 1935' },
    { question: 'Which river is known as the Ganga of the South?', options: ['Godavari', 'Krishna', 'Cauvery', 'Tungabhadra'], correctAnswer: 0, difficulty: 'Medium', explanation: 'Godavari' },
    { question: 'GST was implemented in India from?', options: ['1 July 2017', '1 April 2017', '1 Jan 2018', '15 Aug 2017'], correctAnswer: 0, difficulty: 'Easy', explanation: '1 July 2017' },
    { question: 'Who wrote the national anthem of India?', options: ['Bankim Chandra', 'Rabindranath Tagore', 'Iqbal', 'Sarojini Naidu'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Rabindranath Tagore' },
    { question: 'The highest peak in India is?', options: ['Nanda Devi', 'Kanchenjunga', 'K2 (in PoK)', 'Mount Everest'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Kanchenjunga is highest entirely in India' },
  ],
  'General Knowledge': [
    { question: 'First President of India was?', options: ['Dr. Rajendra Prasad', 'Dr. S. Radhakrishnan', 'Jawaharlal Nehru', 'Maulana Azad'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Dr. Rajendra Prasad' },
    { question: 'How many states are there in India currently?', options: ['28', '29', '27', '30'], correctAnswer: 0, difficulty: 'Easy', explanation: '28 states and 8 UTs' },
    { question: 'The currency of Japan is?', options: ['Yuan', 'Yen', 'Won', 'Ringgit'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Yen' },
    { question: 'WHO headquarters is in?', options: ['New York', 'Geneva', 'Paris', 'London'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Geneva, Switzerland' },
  ],
  'Current Affairs': [
    { question: 'G20 Summit 2023 was held in which Indian city?', options: ['Mumbai', 'New Delhi', 'Bengaluru', 'Hyderabad'], correctAnswer: 1, difficulty: 'Easy', explanation: 'New Delhi' },
    { question: 'Chandrayaan-3 soft-landed on the Moon in which year?', options: ['2022', '2023', '2021', '2024'], correctAnswer: 1, difficulty: 'Easy', explanation: 'August 2023' },
    { question: 'Which country hosted the Olympics 2024?', options: ['Japan', 'USA', 'France', 'Australia'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Paris, France' },
  ],
  'Computer Awareness': [
    { question: 'CPU stands for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Control Processing Unit'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Central Processing Unit' },
    { question: 'Which is an input device?', options: ['Monitor', 'Printer', 'Keyboard', 'Speaker'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Keyboard' },
    { question: '1 Byte = ? bits', options: ['4', '8', '16', '32'], correctAnswer: 1, difficulty: 'Easy', explanation: '8 bits' },
    { question: 'HTTP stands for?', options: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'Hyper Tool Transfer Process', 'None'], correctAnswer: 0, difficulty: 'Easy', explanation: 'HyperText Transfer Protocol' },
  ],
  'General Science': [
    { question: 'Chemical formula of water is?', options: ['H2O', 'CO2', 'O2', 'NaCl'], correctAnswer: 0, difficulty: 'Easy', explanation: 'H2O' },
    { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Mars' },
    { question: 'Photosynthesis occurs in which part of the plant?', options: ['Root', 'Stem', 'Leaf', 'Flower'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Leaf (chlorophyll)' },
    { question: 'SI unit of force is?', options: ['Joule', 'Newton', 'Watt', 'Pascal'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Newton' },
  ],
  'History': [
    { question: 'Battle of Plassey was fought in?', options: ['1757', '1764', '1857', '1526'], correctAnswer: 0, difficulty: 'Easy', explanation: '1757' },
    { question: 'Who founded the Maurya Empire?', options: ['Ashoka', 'Chandragupta Maurya', 'Bindusara', 'Harsha'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Chandragupta Maurya' },
    { question: 'Quit India Movement started in?', options: ['1942', '1930', '1920', '1947'], correctAnswer: 0, difficulty: 'Easy', explanation: 'August 1942' },
    { question: 'First war of Indian Independence is also known as?', options: ['Non-Cooperation', 'Revolt of 1857', 'Civil Disobedience', 'Quit India'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Revolt of 1857' },
  ],
  'Geography': [
    { question: 'Longest river in India is?', options: ['Yamuna', 'Ganga', 'Godavari', 'Brahmaputra'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Ganga' },
    { question: 'Tropic of Cancer passes through how many Indian states?', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'Medium', explanation: '8 states' },
    { question: 'Which is the largest desert in India?', options: ['Thar', 'Ladakh', 'Rann of Kutch', 'Deccan'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Thar Desert' },
  ],
  'Polity': [
    { question: 'How many Fundamental Rights are there in the Indian Constitution?', options: ['5', '6', '7', '8'], correctAnswer: 1, difficulty: 'Easy', explanation: '6 Fundamental Rights' },
    { question: 'Who is the constitutional head of India?', options: ['Prime Minister', 'President', 'Chief Justice', 'Speaker'], correctAnswer: 1, difficulty: 'Easy', explanation: 'President' },
    { question: 'Article 370 was related to?', options: ['Emergency', 'Jammu & Kashmir', 'Reservation', 'Languages'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Special status of J&K (abrogated 2019)' },
    { question: 'Minimum age to become President of India is?', options: ['30', '35', '25', '40'], correctAnswer: 1, difficulty: 'Easy', explanation: '35 years' },
  ],
  'Economy': [
    { question: 'Who presents the Union Budget in India?', options: ['President', 'Prime Minister', 'Finance Minister', 'RBI Governor'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Finance Minister' },
    { question: 'Repo rate is decided by?', options: ['SEBI', 'RBI', 'Finance Ministry', 'NITI Aayog'], correctAnswer: 1, difficulty: 'Easy', explanation: 'RBI' },
    { question: 'GDP stands for?', options: ['Gross Domestic Product', 'General Domestic Product', 'Gross Development Plan', 'Government Development Policy'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Gross Domestic Product' },
  ],
};

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI missing in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  // Admin
  const email = process.env.ADMIN_EMAIL || 'admin@quiz.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  let admin = await Admin.findOne({ email });
  if (!admin) {
    admin = await Admin.create({ email, password, name: 'Super Admin' });
    console.log('Admin created:', email);
  } else {
    console.log('Admin already exists:', email);
  }

  // Categories
  const catMap = {};
  for (const d of categoriesData) {
    let cat = await Category.findOne({ name: d.name });
    if (!cat) cat = await Category.create(d);
    catMap[d.name] = cat;
  }
  console.log('Categories:', Object.keys(catMap).length);

  // Subjects (common for every category)
  const subMap = {}; // key: categoryId|subjectName
  let subCount = 0;
  for (const cat of Object.values(catMap)) {
    for (const s of commonSubjects) {
      const key = `${cat._id}|${s.name}`;
      let sub = await Subject.findOne({ name: s.name, category: cat._id });
      if (!sub) {
        sub = await Subject.create({
          name: s.name,
          category: cat._id,
          icon: s.icon,
          order: s.order,
        });
        subCount++;
      }
      subMap[key] = sub;
    }
  }
  console.log('New subjects created:', subCount);

  // Syllabus
  let sylCount = 0;
  for (const [subName, items] of Object.entries(syllabusMap)) {
    for (const cat of Object.values(catMap)) {
      const sub = subMap[`${cat._id}|${subName}`];
      if (!sub) continue;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const exists = await Syllabus.findOne({ title: it.title, subject: sub._id, category: cat._id });
        if (!exists) {
          await Syllabus.create({
            title: it.title,
            subject: sub._id,
            category: cat._id,
            topics: it.topics || [],
            order: i + 1,
          });
          sylCount++;
        }
      }
    }
  }
  console.log('New syllabus items:', sylCount);

  // Banners
  const bannerCount = await Banner.countDocuments();
  if (bannerCount === 0) {
    await Banner.insertMany(bannersData);
    console.log('Banners seeded:', bannersData.length);
  } else {
    console.log('Banners already exist:', bannerCount);
  }

  // Questions — attach to first few categories for testing (SSC, Banking, UPSC)
  const targetCats = ['SSC', 'Banking', 'UPSC', 'Railways', 'Defence'].map((n) => catMap[n]).filter(Boolean);
  let qCount = 0;
  for (const cat of targetCats) {
    for (const [subName, qs] of Object.entries(questionBank)) {
      const sub = subMap[`${cat._id}|${subName}`];
      if (!sub) continue;
      for (const q of qs) {
        const exists = await Question.findOne({ question: q.question, category: cat._id, subject: sub._id });
        if (!exists) {
          await Question.create({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            category: cat._id,
            subject: sub._id,
            categoryName: cat.name,
            subjectName: sub.name,
            difficulty: q.difficulty || 'Medium',
            explanation: q.explanation || '',
          });
          qCount++;
        }
      }
    }
  }
  console.log('New questions created:', qCount);

  console.log('\\n✅ Seed complete');
  console.log('Login: admin@quiz.com / admin123 (or your ADMIN_EMAIL/PASSWORD)');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
