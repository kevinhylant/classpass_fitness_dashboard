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
        ,activity_types : activity_type_options
        ,class_calendar : class_calendar
        ,weekdays : weekdays
        ,today : today
        ,sample_user : sample_user
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

  app.listen(3000)
  console.log('Express app started on port 3000');
});

  // START - DATA MODELING
  
    // START - API CALLS
      
      var api_domain = 'http://localhost:9393/api';
      var sample_user_endpoint = api_domain+"/users/sample-user";

      var get_sample_user_for_dashboard = function(){
        request.get(sample_user_endpoint, function(err, response, body) {
          if (!err && response.statusCode == 200) {
            console.log('calling sample_user_endpoint');
            var user = JSON.parse(body);
            user = new User(user);
            sample_user = user.attributes;
            sample_user_id = sample_user.id;
            sample_user_activity_preferences = user.activity_preferences();
            sample_user_time_preferences     = user.time_preferences();
            sample_user_advanced_preferences = user.advanced_preferences();

            var upcoming_classes_endpoint = api_domain+"/users/"+sample_user_id+"/classes/upcoming";
            var completed_classes_endpoint = api_domain+"/users/"+sample_user_id+"/classes/completed";
            var studios_endpoint = api_domain+"/studios";


            var get_user_classes_info = function(){
              // UPCOMING CLASSES
              request.get(upcoming_classes_endpoint, function(err, response, body) {
                if (!err && response.statusCode == 200) {
                  console.log('calling upcoming_class_endpoint');
                  upcoming_classes = JSON.parse(body);
                  upcoming_classes_count = upcoming_classes.length; 
                  // CLASS CALENDAR SETUP 
                  class_calendar = generate_class_calendar(upcoming_classes);
                }
              });

              // COMPLETED CLASSES
              request.get(completed_classes_endpoint, function(err, response, body) {
                if (!err && response.statusCode == 200) {
                  console.log('calling completed_classes_endpoint');
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

            var get_studios_info = function(){
              request.get(studios_endpoint, function(err, response, body) {
                if (!err && response.statusCode == 200) {
                  console.log('calling studios endpoint');
                  studios = JSON.parse(body);
                  console.log(studios.length);
                  parse_recommended_studios();

                  
                  
                  // parse_advanced_preferences(); // give 25 points for each studio within 1 point of each of 4 scores, sort by most points
                  // from the top-rated studios, parse to only those that meet user preferences
                }
              });
            }();

          }
        });
      }();


    // END  - API CALLS
    

    today = new Date();
    min_rating     = 3.0;
    studio_counter = 0;
    recommended_studios            = [];
    top_studio_reservations_counts = [];
    top_ratings_match_scores       = [];
    weekdays = ["sunday","monday","tuesday","wednesday","thursday","friday"];
    activity_type_options = ['spin','strength_training','barre','yoga','dance','pilates'];
    time_preference_options = ['after_work','before_work','during_lunch'];
    advanced_rating_options = ['intructor_energy','soreness','sweat_level','upbeat_music'];

    // START - PROTOTYPES 

    Array.prototype.max = function() {
      return Math.max.apply(null, this);
    };

    Array.prototype.min = function() {
      return Math.min.apply(null, this);
    };

    Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {'use strict';
      var O = Object(this);
      var len = parseInt(O.length) || 0;
      if (len === 0) {
        return false;
      }
      var n = parseInt(arguments[1]) || 0;
      var k;
      if (n >= 0) {
        k = n;
      } else {
        k = len + n;
        if (k < 0) {k = 0;}
      }
      var currentElement;
      while (k < len) {
        currentElement = O[k];
        if (searchElement === currentElement ||
           (searchElement !== searchElement && currentElement !== currentElement)) {
          return true;
        }
        k++;
      }
      return false;
    };

    Array.prototype.uniq = function(){
      var u = {}, a = [];
      for(var i = 0, l = this.length; i < l; ++i){
        if(u.hasOwnProperty(this[i])) {
           continue;
        }
        a.push(this[i]);
        u[this[i]] = 1;
      }
      return a;
    };

    Array.prototype.sortNumbersDesc = function(){
      return this.sort(function(a,b){
        return b - a;
      }); 
    };
    Array.prototype.sortNumbersAsc = function(){
      return this.sort(function(a,b){
        return a - b;
      }); 
    };
    
    

    function Studio(self){
      this.attributes           = self;
      this.avg_rating           = 0;
      this.reservation_count    = 0;
      this.hidden_gem_score     = 0;
      this.popularity_score     = (this.avg_rating*2);
      this.advanced_ratings_match_score = 0;
      this.recommendation_score = (this.hidden_gem_score
                                  +this.popularity_score
                                  +this.advanced_ratings_match_score);
      this.avg_advanced_ratings = function(){
        
      }
    }

    .hidden_gem_score);
        console.log("popularity score "+curr_studio.popularity_score);
        console.log("matches advanced ratings score "+curr_studio.advanced_ratings_match_score);
        console.log("recommendation score "+curr_studio.rec

    function User(self){
      this.attributes = self;
      this.activity_preferences = function(){
        pref_hash = this.attributes.preferences;
        var activity_preferences = activity_type_options.filter(function(activity) { return is.truthy(pref_hash[activity]) }).join(", ")
        return activity_preferences.split(",");
      }
      this.time_preferences = function(){
        pref_hash = this.attributes.preferences;
        var time_preferences = time_preference_options.filter(function(time_option) { return is.truthy(pref_hash[time_option]) }).join(", ")
        return time_preferences.split(",");
      }
      this.advanced_preferences = function(){
        pref_hash = this.attributes.preferences;
        var advanced_preferences = {};
        for (var i = 0 ; i < advanced_rating_options.length ; i++ ){
          curr_option = advanced_rating_options[i];
          advanced_preferences[curr_option] = pref_hash[curr_option];
        }
        return advanced_preferences;
      }
    }



    // make sure that a user has preferences!

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
        for(var j = 0 ; j < activity_type_options.length ; j++ ){
          var activity = activity_type_options[j];
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
      for(var i in activity_type_options){activity_breakdown_num[activity_type_options[i]] = 0 ;}
      for(var i in completed_classes) {
        activity_breakdown_num['total']++;
        var activity_type = completed_classes[i]['activity_type'];
        activity_breakdown_num[activity_type]++ ;
      }
      for(var i in activity_type_options){
        var activity = activity_type_options[i];
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

    var parse_recommended_studios = function(){
      studio_activity_types = []
      for (var i = 0 ; i < studios.length ; i++) {
        average_studio_rating(studios[i]);
      }

     
    };
    
    var average_studio_rating = function(studio){
      var studio = new Studio(studio)
      var studio_id = studio.attributes.id;

      var reservation_count = 0;

      var studio_avg_rating_endpoint = api_domain+"/studio/"+studio_id+"/average_rating";
      request.get(studio_avg_rating_endpoint, function(err, response, body) {
        if (!err && response.statusCode == 200) {
          console.log('Calling average studio rating endpoint');
          var avg_rating = JSON.parse(body);
          studio.avg_rating = avg_rating;
          var klasses = studio.attributes.klasses;

          for (var i=0 ; i < klasses.length ; i++ ){
            klass = klasses[i];
            klass_activity_hash = klass.activity_type;
            klass_activity_types = activity_type_options.filter(function(activity) { return is.truthy(klass_activity_hash[activity]) }).join(", ")
            studio_activity_types.push(klass_activity_types);

            var scheduled_classes = klass.scheduled_classes;
            for (var j=0 ; j < scheduled_classes.length ; j++ ) { reservation_count++; }
          }

          studio_activity_types = studio_activity_types.uniq();
          activity_type_overlap = false;
          for (var i ; i < studio_activity_types.length ; i++){
            if(sample_user_activity_preferences.includes(studio_activity_types[i])){
              activity_type_overlap = true;
              break;
            }
          }
          top_studio_reservations_counts.push(reservation_count);
          studio.reservation_count = reservation_count;

          if ( avg_rating >= min_rating && activity_type_overlap) {
            recommended_studios.push(studio);
          }
          studio_counter++;
          if (studio_counter == studios.length){
            assign_recommendation_scores(recommended_studios);
          }
        }
      });
    }

    var assign_recommendation_scores = function(recommended_studios){
      top_studio_reservations_counts = top_studio_reservations_counts.sortNumbersDesc().uniq();
      for( var i = 0, points = 10 ; i < top_studio_reservations_counts.length ; i++ ){
        var curr_top_res_count = top_studio_reservations_counts[i];
        for( var j = 0 ; j < recommended_studios.length ; j++ ){
          var curr_studio = recommended_studios[j];

          if (curr_studio.reservation_count == curr_top_res_count ){
            curr_studio.hidden_gem_score    += points;
            if (points > 0){points--;}
          }
        }
        if (i == (top_studio_reservations_counts.length-1)){console.log(recommended_studios)}
      }

      for (var i = 0 ; i < recommended_studios.length ; i++){
        // calculate the sum of differences between desired advanced qualities and studio's ratings
        
        var curr_studio = recommended_studios[i];
        curr_studio.avg_advanced_ratings();
        sum_total = 0; //sum_total_differences_btwn_adv_pref_and_avg_studio_ratings
        for (var j = 0 ; j < advanced_rating_options.length ; j++) {
          var curr_option = advanced_rating_options[j];
          avg_advanced_ratings = curr_studio.avg_advanced_ratings;
          
          var user_pref = sample_user_advanced_preferences[curr_option];
          var studio_avg = avg_advanced_ratings[curr_option];
          var user_studio_difference = Math.abs(user_pref - studio_avg);
          sum_total += user_studio_difference;
        }
        top_ratings_match_scores.push(sum_total);
    // NOW ADD POINT TOTALS BASED ON RANKING
      }

        console.log("hidden gem score "+curr_studio.hidden_gem_score);
        console.log("popularity score "+curr_studio.popularity_score);
        console.log("matches advanced ratings score "+curr_studio.advanced_ratings_match_score);
        console.log("recommendation score "+curr_studio.recommendation_score);
    }  
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


