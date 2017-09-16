const Express = require('express');
const http = require('http');
const bodyParser = require('body-parser'); // Parse requests, turn them into json
const morgan = require('morgan'); // A logging framework, terminal output for debugging.
const mongoose = require('mongoose'); // ORM between mongo and node.
const cors = require('cors'); // Cors allows requests = require(different domains
const path = require('path'); // manipulate filepaths
const util = require('util');


/* Routes */
const profilesRoutes = require('./routes/profiles.routes.js');
const treesRoutes = require('./routes/trees.routes.js');

/* Controllers */
const treeControllers = require('./controllers/tree.controllers');
const get_prompts = require('./misc/hotprompts');
const fs = require('fs');


// Connect to db.
mongoose.Promise = global.Promise;
var MONGO_DB_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/nulis';
console.log("Connecting to the db at " + MONGO_DB_URL);
mongoose.connect(MONGO_DB_URL, (error) => {
    if (error) {
	console.error('Please make sure Mongodb is installed and running!'); 
	throw error;
    }
});

/* Setup server */
const server = new Express();
server.use(bodyParser.json({type: '*/*'})); 
server.use(cors());
server.set('view engine', 'ejs');
/* server.use(morgan('combined'));*/



/* API */
server.use('/api/v1', profilesRoutes);
server.use('/api/v1', treesRoutes);

/* Serve static files */
server.use('/media',
	   Express.static(path.resolve(__dirname, '../client/media')));
server.use('/downloads',
	   Express.static(path.resolve(__dirname, '../desktop/packages')));
server.get('/bundle.js',(req,res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist/bundle.js'));
});

/* Static pages */
server.use('/static',
	   Express.static(path.resolve(__dirname, './static')));
// index page
server.get('/top-writingprompts-authors', function(req, res) {
    var top_authors = JSON.parse(fs.readFileSync('./misc/top_authors_week.json','utf8'));
    res.render('leaderboard', {authors: top_authors, timeframe:'week', loc:'authors'});
});
server.get('/top-writingprompts-authors/alltime', function(req, res) {
    var top_authors = JSON.parse(fs.readFileSync('./misc/top_authors_all.json','utf8'));
    res.render('leaderboard', {authors: top_authors, timeframe:'all', loc:'authors'});
});

/* Cache */
var mcache = require('memory-cache');
var cache = (duration) => {
    return (req, res, next) => {
	var key = '__express__' + req.originalUrl || req.url;
	var cachedBody = mcache.get(key);
	if (cachedBody) {
	    res.send(cachedBody);
	    return;
	} else {
	    res.sendResponse = res.send
	    res.send = (body) => {
		mcache.put(key, body, duration * 1000);
		res.sendResponse(body)
	    }
	    next()
	}
    }
}

/* 5*60 */
server.get('/prompts', cache(5*60), function(req, res) { 
    /* var prompts = JSON.parse(fs.readFileSync('./misc/hotprompts.json', 'utf8'));*/
    get_prompts((prompts)=>{
	res.render('prompts', {prompts: prompts, loc:'prompts'});
    });
    /* var prompts = require('./misc/hotprompts.json');*/

});

/* Export */
server.get('/tree/:slug.md',treeControllers.exportTree);

/* Send the rest of the requests to be handled by the react router */
server.use((req, res) =>
    res.sendFile(path.resolve(__dirname, '../client/index.html')));

// start server
const port = process.env.PORT || 3000;
server.listen(port, (error) => {
    if (!error) {
	console.log(`Server is running on port ${port}!`);
    } else {
	console.error('Couldnt start server!'); 
    }
});

//export default server;
