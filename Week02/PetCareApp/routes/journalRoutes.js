const express = require('express');
const { isLoggedIn } = require('../middleware/auth');
const journalController = require('../controllers/journalController');

const router = express.Router();

router.get('/journals', isLoggedIn, journalController.list);
router.get('/journals/new', isLoggedIn, journalController.showNew);
router.post('/journals/new', isLoggedIn, journalController.create);
router.get('/journals/edit/:id', isLoggedIn, journalController.showEdit);
router.post('/journals/edit/:id', isLoggedIn, journalController.update);
router.get('/journals/delete/:id', isLoggedIn, journalController.remove);
router.get('/journals/search', isLoggedIn, journalController.search);

module.exports = router;
