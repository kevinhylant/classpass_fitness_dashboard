// module dependencies
var express = require('express')
    ,stylus = require('stylus')
    ,nib = require('nib')
    ,jQuery = require('jquery')
    ,request = require('request')
    ,EJS = require('ejs')

var app = express();
function compile(str,path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}
app.set('views', __dirname + '/views')
app.set('view engine', 'EJS')
app.use(express.logger('dev'))
app.use(express.bodyParser());
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
))
app.use(express.static(__dirname + '/public'))
var cp_api = 'http://localhost:9393/instructors';

var cp_instructor = 'kevin'

app.get('/', function (req, res) {
  api_func(req,res);
  // res.render('index',
  //   {title : 'Home', instructor : cp_instructor}
  // )
})
app.listen(3000)


var api_func = function(req, res) {
  request.get(cp_api, function(err, response, body) {
    if (!err && response.statusCode == 200) {
      var data = JSON.parse(body);
      console.log(data);
      res.render('index', {instructors : data} );
    }
  });
}

