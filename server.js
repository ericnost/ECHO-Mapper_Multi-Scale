require('dotenv').config()

var express = require("express");

var app =  express();

// view engine setup
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('view cache', false);
app.use('/public/images/', express.static('./public/images'));
app.use(express.static('node_modules'))
var bodyParser=require("body-parser"); 
app.use(bodyParser.urlencoded({
  extended: true
}));

const { Client, Query } = require('pg')
// var conString = "postgres://"+process.env.DB_USER+":"+process.env.DB_PASS+"@"+process.env.DB_HOST+"/"+process.env.DB_TABLE; // Your Database Connection

var conString = "postgres://postgres:**************@localhost:****************";

var bounds = [-90,47, -70, 52]
var zoom = 3
var clat = 40
var clng = -100

app.get('/', function (req, res) {
	//This is the initial query. Get data collector and regions. For now, do regions.
	var db_query = "SELECT row_to_json(fc) FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json((fac_count, inspec_cnt, enforc_cnt, violat_cnt)) As properties FROM region As lg) As f) As fc";
	var client = new Client(conString);
    var result=""
    client.connect();
    var query = client.query(new Query(db_query));
    query.on("row", function (row, result) {
        result.addRow(row);
    });
    query.on("end", function (result) {
      var result = result.rows[0].row_to_json;
    	res.render('index', { 
        bounds: bounds, clat:clat, clng:clng, data:result, zoom: zoom
      });
    });

});

app.post('/map', function (req, res) {
	var db_query;
	if (req.body.geo == "state" || req.body.geo == "region") {
		db_query = "SELECT row_to_json(fc) FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json((fac_count, inspec_cnt, enforc_cnt, violat_cnt)) As properties FROM "+req.body.geo+" As lg) As f) As fc";
	} else if (req.body.geo != "exporter042020") {
		db_query = "SELECT row_to_json(fc) FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json(( fac_count, inspec_cnt, enforc_cnt, violat_cnt)) As properties FROM "+req.body.geo+" As lg WHERE lg.geom && ST_MakeEnvelope("+req.body.minLon+", "+req.body.minLat+", "+req.body.maxLon+", "+req.body.maxLat+", 4326)) As f) As fc";
	} else if (req.body.geo == "exporter042020"){
		db_query = "SELECT row_to_json(fc) FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json(( 1, 'FAC_INSPECTION_COUNT', 'FEC_NUMBER_OF_CASES', fac_compliance)) As properties FROM exporter042020 As lg WHERE lg.geom && ST_MakeEnvelope("+req.body.minLon+", "+req.body.minLat+", "+req.body.maxLon+", "+req.body.maxLat+", 4326)) As f) As fc";
	}

	var client = new Client(conString);
    var result=""
    client.connect();
    var query = client.query(new Query(db_query));
    query.on("row", function (row, result) {
        result.addRow(row);
    });
    query.on("end", function (result) {
      var result = result.rows[0].row_to_json;
      res.send(result)
    });

});

app.post('/getContext', function(req, res){
	db_query = "SELECT row_to_json(fc) FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json((name, comment)) As properties FROM context As lg WHERE lg.zoom = "+req.body.zoom+" AND lg.geom && ST_MakeEnvelope("+req.body.minLon+", "+req.body.minLat+", "+req.body.maxLon+", "+req.body.maxLat+", 4326)) As f) As fc";
	var client = new Client(conString);
    var result=""
    client.connect();
    var query = client.query(new Query(db_query))
    query.on("row", function (row, result) {
    	result.addRow(row);
	});
    query.on("end", function (result) {
    	result = result.rows[0].row_to_json
    	console.log(result)
    	res.send(result)
	})
})

//for posting data. need to create contributions db.
app.post('/context', function(req, res){
	console.log(req.body)
	//test file?
	var id = "id"+Math.random().toString()
	var insertion = "INSERT INTO context (geom, zoom, id, name, comment) VALUES (ST_MakePoint('"+req.body.lon+"', '"+req.body.lat+"'),'"+req.body.zoom+"', '"+id+"','"+req.body.name+"','"+req.body.comment+"');"
	var client = new Client(conString);
    var result=""
    client.connect();
    var query = client.query(new Query(insertion))
    query.on("row", function (row, result) {
    	result.addRow(row);
	});
    query.on("end", function (result) {
    	//result = result.rows[0].row_to_json
    	//res.send(result)
	});
})
app.post('/locations', function( req, res, next ) { //need comment parameter
	//need to separate points and polys
	for (i=0; i< req.body.shape.features.length; i++){
		var shape = JSON.stringify(req.body.shape.features[i].geometry)
    	var id = "id"+Math.random().toString()
		var insertion = "INSERT INTO locations (geom, id) VALUES (ST_SetSRID(ST_GeomFromGeoJSON('"+shape+"'),4326),'"+id+"')"
		var client = new Client(conString);
	    var result=""
	    client.connect();
	    var query = client.query(new Query(insertion))
	    query.on("row", function (row, result) {
        	result.addRow(row);
    	});
	    query.on("end", function (result) {
	    	//result = result.rows[0].row_to_json
	    	console.log(result)
	    });
	}
})

app.listen(8080);
console.log('8080 is the magic port');