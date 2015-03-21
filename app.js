// module dependencies
var express = require('express')
    ,request = require('request')
    ,EJS = require('ejs')
    ,partials = require('express-partials')
    ,is = require('is_js')
    ,ss = require('simple-statistics')
    ,datejs = require('datejs')
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
    app.get('/', function (req, res){
      res.render('welcome', 
        {}
      );
    });

    app.get('/fitness-dashboard', function (req, res) {
      res.render('index',
        {upcoming_classes_count : upcoming_classes_count
        ,completed_classes_count : completed_classes_count
        ,upcoming_classes : upcoming_classes 
        ,completed_classes : completed_classes
        ,activity_breakdown_num : activity_breakdown_num
        ,activity_breakdown_percent : activity_breakdown_percent
        ,activity_types : activity_types
        ,class_calendar : class_calendar
        ,weekdays : weekdays
        ,today : today
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
  
    // START - API CALLS
      var user_id = 1;
      var api_domain = 'http://localhost:9393/api'
      var upcoming_classes_endpoint = api_domain+"/users/"+user_id+"/classes/upcoming";
      var completed_classes_endpoint = api_domain+"/users/"+user_id+"/classes/completed";

      var get_user_classes_info = function(){

        // UPCOMING CLASSES
        request.get(upcoming_classes_endpoint, function(err, response, body) {
          if (!err && response.statusCode == 200) {
            upcoming_classes = JSON.parse(body);
            upcoming_classes_count = upcoming_classes.length; 
            // CLASS CALENDAR SETUP 
            class_calendar = generate_class_calendar(upcoming_classes);
          }
        });

        // COMPLETED CLASSES
        request.get(completed_classes_endpoint, function(err, response, body) {
          if (!err && response.statusCode == 200) {
            completed_classes = JSON.parse(body);
            completed_classes_count = completed_classes.length;

            // USER ACTIVITY TYPE BREAKDOWN
            parse_class_activities();          
            calculate_activities_breakdown();

            // CLASS GRADE
            class_grades = {};
            calculate_quantity();
            calculate_variety_score_for('activity_type');
            calculate_variety_score_for('studio');
            calculate_variety_score_for('klass');
            calculate_consistency_score();
          }
        });

      }();

    // END  - API CALLS


    activity_types = ['spin','strength_training','barre','yoga','dance','pilates'];
    weekdays = ["sunday","monday","tuesday","wednesday","thursday","friday"];
    today = new Date();

    // START - PROTOTYPES 

    Array.prototype.max = function() {
      return Math.max.apply(null, this);
    };

    Array.prototype.min = function() {
      return Math.min.apply(null, this);
    };

    // END - PROTOTYPES 

    var generate_class_calendar = function(){
      var class_calendar = {"sunday":   []
                             ,"monday":   []
                             ,"tuesday":  []
                             ,"wednesday":[]
                             ,"thursday": []
                             ,"friday":   []
                             ,"saturday": []
                            }
      var weekdays = Object.keys(class_calendar);
      for (var i = 0 ; i < upcoming_classes.length ; i++ ){
        var start_time = new Date(upcoming_classes[i].start_time);
        upcoming_classes[i].start_time = start_time;
        for (var w in weekdays){
          if (start_time >= today && start_time.getDay() == w) {
            class_calendar[weekdays[w]].push(upcoming_classes[i]);
          }
        }
      }
      return class_calendar;
    }
    
    var parse_class_activities = function(){ 
      for(var i = 0 ; i < completed_classes.length ; i++ ) {
        var activity_type_hash = completed_classes[i].activity_type;
        for(var j = 0 ; j < activity_types.length ; j++ ){
          var activity = activity_types[j];
          if (typeof(activity) == 'string'){
            if (is.not.null(activity_type_hash[activity])){
              completed_classes[i].activity_type = activity;
            }
          }
        }
      } 
    }   

    var calculate_activities_breakdown = function(){
      activity_breakdown_num = {};
      activity_breakdown_percent = {};
      activity_breakdown_num['total'] = 0;
      for(var i in activity_types){activity_breakdown_num[activity_types[i]] = 0 ;}
      for(var i in completed_classes) {
        activity_breakdown_num['total']++;
        var activity_type = completed_classes[i]['activity_type'];
        activity_breakdown_num[activity_type]++ ;
      }
      for(var i in activity_types){
        var activity = activity_types[i];
        activity_breakdown_percent[activity] = (activity_breakdown_num[activity]/activity_breakdown_num['total'])*100;
      }
    } 

    var calculate_quantity = function(){
      var score = completed_classes_count*(rubric.quantity);
      if(score > 25){score=25;}
      class_grades['quantity'] = score;
    }

    var calculate_variety_score_for = function(type){
      var ccs_per_unique_record = {};
      for(var i = 0 ; i < completed_classes.length ; i++ ){
        if (type == 'studio' || type == 'klass'){
          var curr_record = (completed_classes[i][type].name);
        }
          else {
            var curr_record = completed_classes[i][type];
          }
        var current_record_count = ccs_per_unique_record[( curr_record )];

        if ( current_record_count > 0 ) {
          ccs_per_unique_record[( curr_record )] = (current_record_count+1);
        }
          else {
            ccs_per_unique_record[( curr_record )] = 1;
          }
      }
      
      var records = Object.keys(ccs_per_unique_record)
         ,completed_classes_record_type_totals = records.map(function(v) { return ccs_per_unique_record[v]; })
         ,completed_classes_breakdown_by_record_type = completed_classes_record_type_totals.map(function(v) { return (v/completed_classes_count); });

      var score = 25
         ,bonus = 0
         ,penalty = 0;

      if ( type=='activity_type' ){ 
        var penalty = ss.standard_deviation(completed_classes_breakdown_by_record_type);

        if ( penalty>25 || records.length == 1 ) {penalty = 25;}
        
        if (records.length >= 2 ){bonus = 5}
          else if (records.length >= 3 ){bonus = 8}
          else if (records.length >= 4 ){bonus = 10}
          else if (records.length >= 5 ){bonus = 11}
          else if (records.length >= 6 ){bonus = 12}
      }

        else if ( type=='studio'){

          if      (completed_classes_record_type_totals.length <= 2){penalty = 25}
            else if (completed_classes_record_type_totals.length <= 3){penalty = 20}
            else if (completed_classes_record_type_totals.length <= 4){penalty = 15}
            else if (completed_classes_record_type_totals.length <= 5){penalty = 10}
            else if (completed_classes_record_type_totals.length <= 6){penalty = 5}
            else    {penalty = 0}
        }

        else if ( type=='klass'){
          if      (completed_classes_record_type_totals.length <= 3){penalty = 25}
            else if (completed_classes_record_type_totals.length <= 4){penalty = 20}
            else if (completed_classes_record_type_totals.length <= 5){penalty = 15}
            else if (completed_classes_record_type_totals.length <= 6){penalty = 10}
            else if (completed_classes_record_type_totals.length <= 7){penalty = 5}
            else    {penalty = 0}
        }

      score -= penalty;
      score += bonus;
      if(score > 25){score = 25;}
      class_grades[type] = score;

      // console.log(class_grades);
    }

    var calculate_consistency_score = function(){
      var weekly_classes_hash = {}
         ,score = 25
         ,bonus = 0
         ,penalty = 0;
      for( var i = 0 ; i < completed_classes.length ; i++ ) {
        var start_time = new Date(completed_classes[i].start_time);
        completed_classes[i].start_time = start_time;
        var week = start_time.getWeek();
        if ( is.undefined(weekly_classes_hash[week]) ){ 
          weekly_classes_hash[week] = 1;
        }
          else { weekly_classes_hash[week]++ }
      }

      var weeks = Object.keys(weekly_classes_hash)
         ,wk_totals = weeks.map(function(v) { return weekly_classes_hash[v]; });

      if(wk_totals.min() <= 1){ penalty = 20 }
        else if(wk_totals.min() <= 2){ penalty = 10 }
        else if(wk_totals.min() <= 3){ penalty = 4 }
        else if(wk_totals.min() <= 4){ penalty = 2 }
        else if(wk_totals.min() <= 5){ penalty = 0 }
     
      score -= penalty;
      score += bonus;
      if(score > 25){score = 25;}

      class_grades['consistency'] = score ;  
    }

    var finalize_activity_score = function(completed_classes_breakdown_by_record_type){
      var raw_point_tot = completed_classes_breakdown_by_record_type.reduce(function(prev, curr) {
          return prev * curr;     // raw points equal the product of each activity type's composition of the total
        }); 
      var score = (raw_point_tot*(rubric.activity_variety));
      return score;
    }

    var rubric = {
      'quantity'        : 1,    // points per class 
      'activity_variety': 1.0,  // point multiplier. multiplied by point totals per activity type.
      'studio_variety'  : 4.16, // point per unique studio (ideal is 6 diff studios)
      'class_variety'   : 0.5,  //         
      'consistency'     : 0.5     
    }

    var point_max_per_category = 25;

    
           
  // END   - DATA MODELING




// Rubric Explanations
  // Activity Variety
    // Took 5 users with varying activity varieties which were to serve as benchmarks for diversity from very diverse to less diverse
    // Also wanted to scale the grading so that there was a sharp increase at 3 activity types, but then tapers toward 6
      // var samples = [ [6,4,7,3,5,5],[10,5,5,8,2],[7,8,10,15],[5,10,15],[5,25],[30] ]
    // Wanted to create a reasonable bell curve
    // The resulting sample standard deviations were: 
      // 4.303314829119352
      // 9.189365834726813
      // 10.274023338281628
      // 13.608276348795435
      // 33.33333333333334
      // 0
    // Needed to account for no diversity (1 class type) and assign a 25 point penalty
    // Made point penalty equal to deviation amount to a max of 25 points
  // Studio Variety
    //  Perfectly diverse would be 6 different studios


