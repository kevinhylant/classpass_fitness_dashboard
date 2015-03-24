var assert = require("assert");

dashboard = require("../app.js")
cpStudio = dashboard.cpStudio


describe('Array', function(){ 
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));      
    })
  })
})
describe('cpStudio', function(){ 
  var barrys = new Studio()

  describe('prototype methods', function(){
    it('should return 0 for main attributes upon initialization', function(){
      assert.equal(0, barrys.avg_rating);
      assert.equal(0, barrys.reservation_count);
    })
  })
})
