
$( document ).ready(function() {
  var percents =  $('.percent');

  for (var i = 0 ; i < percents.length ; i++){
    var field = $(percents[i]);
    var field_value = parseFloat(field.html());
    field.html(accounting.formatMoney(field_value, "", 0));
  }

  var class_grade =  $($('#class-grade-total'));
  
  var field_value = parseFloat(class_grade.html());
  class_grade.html(accounting.formatMoney(field_value, "", 0));

  var activity_stat_squares = $('.activity-stat-square');
  $(activity_stat_squares).hover( function(){
    $(this).find('.orig-fields').toggle();
    $(this).find('.hover-fields').toggle();
  });

  var hero_subnav_filter = $('.hero-subnav ul li');
  hero_subnav_filter.on('click', function(){
    var siblings = $($(this).siblings());
    siblings.find('a').removeClass('active');
    $(this).find('a').addClass('active');
  });

  var rec_subnav_filter = $('.rec-subnav ul li');
  rec_subnav_filter.on('click', function(){
    var siblings = $($(this).siblings());
    siblings.find('a').removeClass('active');
    $(this).find('a').addClass('active');
  });

  $('.avatar-small').hover(function(){
    $(this).find('h3').toggle();
    $(this).find('h1').toggle();
  });

  var calendar_content = $('.class-content');
  for (var i = 0 ; i < calendar_content.length ; i++ ){
    
    if( $(calendar_content[i]).children().length < 1){
      $(calendar_content[i]).html("<div class='add-class'><h1 class='plus-sign center'>+</h1></div>");
    }
  }

  $('a').on('click',function(event){
    event.preventDefault();
  });

}); 
