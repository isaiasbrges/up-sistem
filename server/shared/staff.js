'use strict';
const {fail}=require('./errors');
async function requireStaff(client,userId,adminOnly=true){
  const {rows:[user]}=await client.query("SELECT platform_role FROM up.users WHERE id=$1 AND status='active'",[userId]);
  if(!user||!['admin','suporte'].includes(user.platform_role)||(adminOnly&&user.platform_role!=='admin'))fail(403,'STAFF_REQUIRED','Esta operação é restrita à equipe autorizada.');
  return user.platform_role;
}
module.exports={requireStaff};
