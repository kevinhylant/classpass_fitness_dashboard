// module dependencies
var express = require('express')
    ,request = require('request')
    ,EJS = require('ejs')
    ,partials = require('express-partials')
    // ,asset_pipeline = require('asset-pipeline')

var app = express();

// APP CONFIGURATION
app.configure(function(){

  app.set('views', __dirname + '/views')
  app.set('view engine', 'EJS')
  app.use(express.logger('dev'))
  app.use(express.bodyParser());
  app.use(partials());




  // START - ROUTES
    app.get('/fitness-dashboard', function(req, res){
      res.render('fitness_dashboard', 
        { users: users 
        }
      );
    });


    app.get('/', function (req, res) {
      res.render('index',
        // {layout:'header'},
        {u_basic_stats : user_basic_stats
        ,u_activities_breakdown : user_activities_breakdown
        ,u_upcoming_classes : user_upcoming_classes 
        }
      );
    })
  // END - ROUTES


  // START - APP ASSET CONFIG
    app.use('/stylesheets', express.static(__dirname + '/assets/stylesheets'));
    app.use('/javascripts', express.static(__dirname + '/assets/javascripts'));
    app.use('/fonts', express.static(__dirname + '/assets/fonts'));
    app.use('/images', express.static(__dirname + '/assets/images'));
    app.use('/bower_components', express.static(__dirname + '/bower_components'));
  // END   - APP ASSET CONFIG


  // FUTURE MODIFICATIONS?
    // Use 'asset_pipeline'
  

  app.listen(3000)
  console.log('Express app started on port 3000');
});

  // START - DATA MODELING
  var users = [
    { name: 'tj', email: 'tj@sencha.com' }
  , { name: 'ciaran', email: 'ciaranj@gmail.com' }
  , { name: 'aaron', email: 'aaron.heckmann+github@gmail.com' }
  ];

  // API CALLS TO COLLECT DATA
    var user = 722
    var basic_user_stats_api = 'http://localhost:9393/basic_user_stats/'+user;
    var user_activities_breakdown_api = 'http://localhost:9393/user_activities_breakdown/'+user;
    var user_upcoming_classes_api = 'http://localhost:9393/user_upcoming_classes/'+user;

    var get_user_basic_stats = function(){
      request.get(basic_user_stats_api, function(err, response, body) {
        if (!err && response.statusCode == 200) {
          user_basic_stats = JSON.parse(body);
        }
      });
    }();
    var get_user_activities_breakdown = function(){
      request.get(user_activities_breakdown_api, function(err, response, body) {
        if (!err && response.statusCode == 200) {
          user_activities_breakdown = JSON.parse(body);
        }
      });
    }();
    var get_user_upcoming_classes = function(){
      request.get(user_upcoming_classes_api, function(err, response, body) {
        if (!err && response.statusCode == 200) {
          user_upcoming_classes = JSON.parse(body);
          console.log(user_upcoming_classes);
        }
      });
    }();
  // END   - DATA MODELING







