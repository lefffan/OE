import argon2 from 'argon2';
import * as globals from '../globals.js';

//////////////////////////
const USERPOLICYDIALOG = { title: { type: 'title', data: 'Policy settings' },
                           groups: { type: 'textarea', head: 'Groups~Enter group names one by line the user belongs to. User groups are defined here only and act as kind of user tags in any user specific permission/restriction settings. Any names in that kind of settings are interpreted as user names, in case of no user name found - as a group name', data: '' },
                           instances: { type: 'text', head: 'Logged-in instances~Zero value disables login and SCHEDULE event from the user. Empty/incorrect value - no instances limit', data: '1' },
                           timeout: { type: 'text', head: 'Idle timout~Timeout in minutes after the user is logged out. Empty/incorrect/zero value - no timeout', data: '720', flag: '*' },
                           read: { type: 'textarea', head: "Restrict user READ access to next OD/OV id combinations~Enter OD id and OV id divided via some spaces or tab one by line for each combination. Char '!' inverts the match, absent OV id matches all views of specified OD. This per user restriction has a a higher priority than OVs reaad access restriction. Example: '1 2' - OV 2 of OD 1 is unaccessable (no read access) for the user, '3 !4' - any OV except OV with id 4 of OD 3 is unaccessable (another words user has read acccess to OV with id 4 only, '5' - all views of OD 5 are unaccessable for the user", data: '' },
                           write: { type: 'textarea', head: "Restrict user WRITE access to next OD/OV id combinations~See READ access restriction hint above", data: '' },
                           create: { type: 'checkbox', data: 'Restrict the user to create OD' },
                           run: { type: 'checkbox', data: 'Restrict the user to run Task Manager' },
                           ok: JSON.parse(globals.BUTTONOK),
                           cancel: JSON.parse(globals.BUTTONCANCEL),
                         };
//////////////////////////
const USERMACROSDIALOG = { // Todo2 - make user-specific macros?
                           title: { type: 'title', data: 'Macros' },
                           macroses: { type: 'select', flag: '+Enter new macro name',
                                       head: `Macro list~User macro list is an optional list of some text data associated with the specified macro name, which may be used in any database configuration settings via js style quoted expression \${<macro name>}. Macros may be nested, so one macro may contain another. Macro loops, when one macro contains another that contains first one, are ignored. Loop case calculation value is set to empty string - when one macro contains another that contains first, this another macro receives an empty string as a first macro value`,
                                       data: { 'New macro~+': { 10: { type: 'textarea', head: 'Macro value', data: '' },
                                                                20: { type: 'textarea', head: 'Macro description', data: '', flag: '*' } } } },
                           ok: JSON.parse(globals.BUTTONOK),
                           cancel: JSON.parse(globals.BUTTONCANCEL),
                         };
//////////////////////////
const newevent         = { events: { type: 'select', head: 'Select event type', data: globals.CLIENTEVENTS.join(globals.OPTIONSDIVIDER) },
                           modifier: { type: 'checkbox', head: 'Select event modifier keys~For mouse and keyboard (except KEYPRESS) events only. Note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved by client app (browser) for its default behaviour, so may never occur', data: 'Ctrl/Alt/Shift/Meta', expr: `/${[...globals.CALLBACKEVENTS, ...globals.MISCEVENTS, 'KEYPRESS'].join('~\!|')}~!/events` },
                           attr: { type: 'text', head: 'Event attribute~For ONEVENT and ONTIMER events only', data: '', flag: '*', expr: '/^(?!.*(ONEVENT~\!|ONTIMER~\!)).*$/events' },
                           handlertype: { type: 'select', head: 'Handler type', data: 'Disabled~!/Fixed output/Command line/Shell command line/Module function' },
                           handlerdata: { type: 'textarea', head: 'Handler specific data', data: '', expr: '/Disabled~!/handlertype' },
                           timeout: { type: 'text', head: `Handler timeout~Timeout, in seconds, for the controller to wait the handler to response. For incorrect/undefined string a default value of 30 sec is used. The setting is applied for 'Command line' and 'Eval' handler types only`, data: '30', expr: '/^(?!.*Shell command line~\!)(?!.*Command line~\!)/handlertype' },
                           retry: { type: 'text', head: `Retries~Handler restart attempts on timeout. For incorrect/undefined string a zero value (0 retries) is used: the handler is not restarted after timeout. The setting is applied for 'Command line' or 'Eval' handler types only`, data: '0', flag: '', expr: '/^(?!.*Shell command line~\!)(?!.*Command line~\!)/handlertype' },
                           output: { type: 'radio', head: 'Handler result action', data: `Apply~!/Wrap/Debug/Ignore`, expr: '/Disabled~!/handlertype' }, // any stdout or stderr is checked for 'Process' apply action - this type of output is wrapped to { type: 'SET', data: <stdout/stderr>}. For 'Message' apply action any stdout/stderr is displayed as an info msg at client side
                         };
const neweventgroup    = { 10: { type: 'select', head: 'Select event profile', data: { 'New event~+': newevent }, flag: '*' } };
const EVENTGROUPDIALOG = { title: { type: 'title', data: 'Event profiling' },
                           eventprofiles: { type: 'select', head: 'Select event group profile', data: { 'New event group~+': neweventgroup } },
                           ok: JSON.parse(globals.BUTTONOK),
                           cancel: JSON.parse(globals.BUTTONCANCEL),
                         };
// 
//////////////////////////
const WARNINGDIALOG    = { title: { type: 'title', data: 'Warning' },
                           msg: { type: 'input' },
                           ok: { type: 'button', data: '  OK  ' }
                         };
//////////////////////////

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
              WARNINGDIALOG.msg.head = `Super user '${globals.SUPERUSER}' as a super user has no any restrictions, so policy settings change is not available!`;
              return `{ "type": "SET", "data": ${JSON.stringify(username === globals.SUPERUSER ? WARNINGDIALOG : USERPOLICYDIALOG)} }`;
         case 'eid5': // GUI customization dialog - all new users are created with default customization. Good practice is not to change super user customization, so other users can use root one via 'force' option in user-customization dialog. Changeble for own users only
              return `{ "type": "SET", "data": ${JSON.stringify(globals.CUSTOMIZATIONDIALOG)} }`;
         case 'eid6': // Event group profiling dialog - changeble and viewable for root user only
              WARNINGDIALOG.msg.head = `Please, use super user object instead of '${username}' to configure application event profiles`;
              return `{ "type": "SET", "data": ${JSON.stringify(username === globals.SUPERUSER ? EVENTGROUPDIALOG : WARNINGDIALOG)} }`;
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
