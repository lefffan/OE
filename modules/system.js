import argon2 from 'argon2';
import * as consts from '../static/consts.js';

const USERPOLICYDIALOG = { title: { type: 'title', data: 'Policy settings' },
                           groups: { type: 'textarea', head: 'Groups~Enter group names one by line the user belongs to. User groups are defined here only and act as kind of user tags in any user specific permission/restriction settings. Any names in that kind of settings are interpreted as user names, in case of no user name found - as a group name', data: '' },
                           instances: { type: 'text', head: 'Logged-in instances~Zero value disables login and SCHEDULE event from the user. Empty/incorrect value - no instances limit', data: '1' },
                           timeout: { type: 'text', head: 'Idle timout~Timeout in minutes after the user is logged out. Empty/incorrect/zero value - no timeout', data: '720', flag: '*' },
                           read: { type: 'textarea', head: "Restrict user READ access to next OD/OV id combinations~Enter OD id and OV id divided via some spaces or tab one by line for each combination. Char '!' inverts the match, absent OV id matches all views of specified OD. This per user restriction has a a higher priority than OVs reaad access restriction. Example: '1 2' - OV 2 of OD 1 is unaccessable (no read access) for the user, '3 !4' - any OV except OV with id 4 of OD 3 is unaccessable (another words user has read acccess to OV with id 4 only, '5' - all views of OD 5 are unaccessable for the user", data: '' },
                           write: { type: 'textarea', head: "Restrict user WRITE access to next OD/OV id combinations~See READ access restriction hint above", data: '' },
                           create: { type: 'checkbox', data: 'Restrict the user to create OD' },
                           task: { type: 'checkbox', data: 'Restrict the user to run Task Manager' },
                           ok: JSON.parse(consts.BUTTONOK),
                           cancel: JSON.parse(consts.BUTTONCANCEL),
                         };

// Function return element data for new objects od OD 'Users', function args: eid - element id to return data for, value - input data, username - user name to return data for (return events dialog structure for root user only)
// Todo0 - User dialog settings: (user.js <eid> <username>) (dialogedit.js CREATEDIALOG|CONFIRMDIALOG data flag) data is a string (json or not) and flag (for json is option additive/not, for not json is confirmable/not)
export async function AddUser(eid, value, username)
{
 const dialog = JSON.parse(consts.WARNINGDIALOG);
 switch (eid)
        {
         case '1': // Username - input <value> acts as a user name, so set it as an element value excluding non-symbol chars with '!'. Username is unchangable after creation
              return `{ "type": "SET", "data": "${value.replace(/\W|\!/g, '')}" }`;
         case '2': // Password - the field is untouched on user add process, so user pass should be changed later by the root. Password is changeble by the own user (or super user) only. Empty pass diallows login, but allows cron execution
              return await HashPassword(value);
         case '3': // Custom user props - such as name, tel, email, foto, other info.. Changeble for own users (or super user) only
              return `{ "type": "SET", "data": { "Name": "", "Phone": "", "Email": "" } }`;
         case '4': // Policy dialog - changeble for previlige users only
              dialog.msg.head = `Super user '${consts.SUPERUSER}' as a super user has no any restrictions, so policy settings change is not available!`;
              return `{ "type": "SET", "data": ${JSON.stringify(username === consts.SUPERUSER ? /*WARNINGDIALOG - Todo0 - no policy for super user*/ USERPOLICYDIALOG : USERPOLICYDIALOG)} }`;
         case '5': // GUI customization dialog - all new users are created with default customization. Good practice is not to change super user customization, so other users can use root one via 'force' option in user-customization dialog. Changeble for own users only
              return `{ "type": "SET", "data": ${JSON.stringify(consts.CUSTOMIZATIONDIALOG)} }`;
         case '6': // Event group profiling dialog - changeble and viewable for root user only
              dialog.msg.head = `Please, use super user object instead of '${username}' to configure application event profiles`;
              return `{ "type": "SET", "data": ${JSON.stringify(username === consts.SUPERUSER ? consts.EVENTGROUPDIALOG : dialog)} }`;
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
