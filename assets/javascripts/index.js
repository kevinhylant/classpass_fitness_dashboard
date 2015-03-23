
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

  
}); 
