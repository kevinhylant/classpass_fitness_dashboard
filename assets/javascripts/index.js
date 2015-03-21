
$( document ).ready(function() {
  var percents =  $('.percent');

  for (var i in percents){
    if (i < percents.length){
      var field = $(percents[i]);
      var field_value = parseFloat(field.html());
      field.html(accounting.formatMoney(field_value, "", 0));
    }
  }
  
  
}); 
