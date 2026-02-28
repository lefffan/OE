import * as globals from './globals.js';

const USERPOLICYDIALOG = {
                          title: { type: 'title', data: 'Policy settings' },
                          groups: { type: 'textarea', head: 'Groups~Enter group names one by line the user belongs to. User groups are defined here only and act as kind of user tags in any user specific permission/restriction settings. Any names in that kind of settings are interpreted as user names, in case of no user name found - as a group name', data: '' },
                          instances: { type: 'text', head: 'Logged-in instances~Empty, incorrect or zero value disables login and SCHEDULE event from the user', data: '1' },
                          timeout: { type: 'text', head: 'Idle timout~Timeout in minutes after the user is logged out. Empty/incorrect/zero value - min value of 5 minutes is used', data: '720', flag: '*' },
                          read: { type: 'textarea', head: "Restrict user READ access to next OD/OV id combinations~Enter OD id and OV id divided via some spaces or tab one by line for each combination. Char '!' inverts the match, absent OV id matches all views of specified OD. This per user restriction has a a higher priority than OVs reaad access restriction. Example: '1 2' - OV 2 of OD 1 is unaccessable (no read access) for the user, '3 !4' - any OV except OV with id 4 of OD 3 is unaccessable (another words user has read acccess to OV with id 4 only, '5' - all views of OD 5 are unaccessable for the user", data: '' },
                          write: { type: 'textarea', head: "Restrict user WRITE access to next OD/OV id combinations~See READ access restriction hint above", data: '' },
                          create: { type: 'checkbox', data: 'Restrict the user to create OD' },
                          run: { type: 'checkbox', data: 'Restrict the user to run Task Manager' },
                          ok: JSON.parse(globals.BUTTONOK),
                          cancel: JSON.parse(globals.BUTTONCANCEL),
                         };
const USERMACROSDIALOG = {
                          title: { type: 'title', data: 'Macroses' },
                          macroses: { type: 'select', flag: '+Enter new macros name',
                                      head: `Macros list~User macros list is an optional list of some text data associated with the specified macros name, which may be used in any database configuration settings via js style quoted expression \${<macros name>}. Macroses may be nested, so one macros may contain another. Macros loops, when one macros contains another that contains first one, are ignored. Loop case calculation value is set to empty string - when one macros contains another that contains first, this another macros receives an empty string as a first macros value`,
                                      data: { 'New macros~+': { 10: { type: 'textarea', head: 'Macros value', data: '' },
                                                                20: { type: 'textarea', head: 'Macros description', data: '', flag: '*' } } } },
                          ok: JSON.parse(globals.BUTTONOK),
                          cancel: JSON.parse(globals.BUTTONCANCEL),
                         };

const handlerprofile              = {
                                     type: { type: 'radio', head: 'Select handler type', data: 'Command line/Fixed stdout/Eval/Disabled~!' },
                                     data: { type: 'textarea', head: 'Enter data for specified handler type above', data: '', expr: '/Disabled~!/type' },
                                     output: { type: 'checkbox', head: 'Process next handler output only', data: 'correct JSON (stdout)~!/any output (stdout)/stderr/undefined', expr: '/Disabled~!/type', flag: '!' },
                                     action: { type: 'radio', head: 'Handler output action', data: 'Apply~!/Message/Ignore/Redirect to next step', flag: '*', expr: '/Disabled~!/type' },
                                     timeout: { type: 'text', head: `Handler timeout~Timeout, in seconds, for the controller to wait the handler to response. For incorrect/undefined string a default value of 30 sec is used. The setting is applied for 'Command line' or 'Eval' handler types only`, data: '30', expr: '/Disabled~!/type' },
                                     retry: { type: 'text', head: `Retries~Handler restart attempts on timeout. For incorrect/undefined string a zero value (0 retries) is used: the handler is not restarted after timeout. The setting is applied for 'Command line' or 'Eval' handler types only`, data: '0', expr: '/Disabled~!/type' },
                                    };
const eventtemplate               = {
                                     events: { type: 'select', head: 'Select event type', data: globals.CLIENTEVENTS.join(globals.OPTIONSDIVIDER) },
                                     modifier: { type: 'checkbox', head: 'Select modifier keys~For mouse and keyboard events only. Note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved by client app (browser) for its default behaviour, so may never occur', data: 'Ctrl/Alt/Shift/Meta', flag: '*' },
                                     step1: { type: 'select', head: 'Select a handler output data redirection step', data: { 'Step1': handlerprofile } } // Naming: SCHEDULE<NAME>, MACROS<NAME>. Specific settings - crontab line for SCHEDULE with name to distinguish, macros name for MACROS and FORCE to use next event handler scheme
                                    };
const eventlistprofiletemplate    = { 10: { type: 'select', head: 'Select event profile', data: { 'New event~+': eventtemplate }, flag: '*' } };
const EVENTPROFILINGDIALOG        = { title: { type: 'title', data: 'Event profiling' },
                                      eventprofiles: { type: 'select', head: 'Select event group profile', data: { 'New event group~+': eventlistprofiletemplate } },
                                      ok: JSON.parse(globals.BUTTONOK),
                                      cancel: JSON.parse(globals.BUTTONCANCEL),
                                    };

const WARNINGDIALOG               = { title: { type: 'title', data: 'Warning' },
                                      msg: { type: 'input' },
                                      ok: { type: 'button', data: '  OK  ' }
                                    };

// Function return element data for new objects od OD 'Users', function args: eid - element id to return data for, value - input data, username - user name to return data for (return events dialog structure for root user only)
// Todo0 - User dialog settings: (user.js <eid> <username>) (dialogedit.js CREATEDIALOG|CONFIRMDIALOG data flag) data is a string (json or not) and flag (for json is option additive/not, for not json is confirmable/not)
export function AddUser(eid, value, username)
{
 switch (eid)
        {
         case '1': // Username - input <value> acts as a user name, so set it as an element value excluding non-symbol chars with '!'
              return `{ "type": "SET", "data": "${value.replace(/\W|\!/g, '')}" }`;
         case '2': // Password - the field is untouched on user add
              return `{ "type": "SET", "data": "" }`;
         case '3': // Custom user props
              return `{ "type": "SET", "data": { "Name": "", "Phone": "", "Email": "" } }`;
         case '4': // Policy dialog
              WARNINGDIALOG.msg.head = 'Super user policy settings have no any restrictions and cannot be changed!';
              return `{ "type": "SET", "data": "${JSON.stringify(username === globals.SUPERUSER ? WARNINGDIALOG : USERPOLICYDIALOG)}" }`;
         case '5': // Macroses dialog
              return `{ "type": "SET", "data": "${JSON.stringify(USERMACROSDIALOG)}" }`;
         case '6': // Customization dialog
              return `{ "type": "SET", "data": "${JSON.stringify(globals.CUSTOMIZATIONDIALOG)}" }`;
         case '7': // Event profiling dialog
              WARNINGDIALOG.msg.head = 'Event profiling is super user option only!';
              return `{ "type": "SET", "data": "${JSON.stringify(username === globals.SUPERUSER ? EVENTPROFILINGDIALOG : WARNINGDIALOG)}" }`;
        }
}

// { "type": "DIALOG", "data": '{ "content": '${}' }' }