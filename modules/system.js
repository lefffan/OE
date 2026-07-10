import argon2 from 'argon2';
import { SUPERUSER, CUSTOMIZATIONDIALOG, EVENTGROUPDIALOG, USERPOLICYDIALOG, WARNINGDIALOG } from '../globals.js';

// Function return element data for new objects od OD 'Users', function args: eid - element id to return data for, value - input data, username - user name to return data for (return events dialog structure for root user only)
// Todo0 - User dialog settings: (user.js <eid> <username>) (dialogedit.js CREATEDIALOG|CONFIRMDIALOG data flag) data is a string (json or not) and flag (for json is option additive/not, for not json is confirmable/not)
export async function AddUser(eid, value, username)
{
 switch (eid)
        {
         case 'eid1': // Username - input <value> acts as a user name, so set it as an element value excluding non-symbol chars with '!'. Username is unchangable after creation
              return `{ "type": "SET", "data": "${value.replace(/\W|\!/g, '')}" }`;
         case 'eid2': // Password - the field is untouched on user add process, so user pass should be changed later by the root. Password is changeble by the own user (or super user) only. Empty pass diallows login, but allows cron execution
              return await HashPassword(value);
         case 'eid3': // Custom user props - such as name, tel, email, foto, other info.. Changeble for own users (or super user) only
              return `{ "type": "SET", "data": { "Name": "", "Phone": "", "Email": "" } }`;
         case 'eid4': // Policy dialog - changeble for previlige users only
              WARNINGDIALOG.msg.head = `Super user '${SUPERUSER}' as a super user has no any restrictions, so policy settings change is not available!`;
              return `{ "type": "SET", "data": ${JSON.stringify(username === SUPERUSER ? /*WARNINGDIALOG - Todo0 - no policy for super user*/ USERPOLICYDIALOG : USERPOLICYDIALOG)} }`;
         case 'eid5': // GUI customization dialog - all new users are created with default customization. Good practice is not to change super user customization, so other users can use root one via 'force' option in user-customization dialog. Changeble for own users only
              return `{ "type": "SET", "data": ${JSON.stringify(CUSTOMIZATIONDIALOG)} }`;
         case 'eid6': // Event group profiling dialog - changeble and viewable for root user only
              WARNINGDIALOG.msg.head = `Please, use super user object instead of '${username}' to configure application event profiles`;
              return `{ "type": "SET", "data": ${JSON.stringify(username === SUPERUSER ? EVENTGROUPDIALOG : WARNINGDIALOG)} }`;
         default:
              return '';
        }
}

export async function HashPassword(password)
{
 try {
      const hash = await argon2.hash(password, {
                                                type: argon2.argon2id,     // argon2id is recomended type for default
                                                memoryCost: 65536,         // 64 MB is set specifically for your server
                                                timeCost: 3,               // iterations number
                                                parallelism: 4             // streams number
                                               });
      return `{ "type": "SET", "data": "${hash}" }`;
     }
 catch (error)
     {
      return `{ "type": "INFO", "data": { "content": "Error hashing the password: ${error.message}" } }`;
     }
}

// Functions confirm incoming content
export async function SetData(data, prop)
{
 return typeof prop === 'string' ? `{"type": "SET", "data": { "${prop}": "${data}" } }` : `{"type": "SET", "data": "${data}" } }`;
}
