const passwordValidator = require('password-validator');

const productionSchema = new passwordValidator();

productionSchema
  .is().min(8)
  .is().max(20)
  .has().digits()
  .has().letters()
  .has().symbols()
  .has().not().spaces()


const devSchema = new passwordValidator();

devSchema
  .is().min(1)
  .is().max(20)

if(process.env.NODE_ENV === 'dev') {
  module.exports = devSchema;
} else {
  module.exports = productionSchema;
}
