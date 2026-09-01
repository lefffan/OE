import argon2 from 'argon2';
import * as consts from '../static/consts.js';
import * as funcs from '../static/funcs.js';

// Password correctness check and hashing. Todo0 - add uppercase/lowercase letters and digits presence check
async function HashPassword(newpass, confirmpass)
{
 if (typeof newpass !== 'string' || typeof confirmpass !== 'string' || newpass !== confirmpass) return `{ "type": "NULL", "warning": "Confirm password doesn't match the password!" }`;
 if (newpass.length < consts.USERPASSMINLENGTH) return `{ "type": "NULL", "warning": "User password must be min ${consts.USERPASSMINLENGTH} chars length!" }`;

 try {
      const hash = await argon2.hash(newpass, {
                                                type: argon2.argon2id,     // argon2id is recomended type for default
                                                memoryCost: 65536,         // 64 MB is set specifically for your server
                                                timeCost: 3,               // iterations number
                                                parallelism: 4             // streams number
                                               });
      return `{ "type": "SET", "data": "${hash}", "warning": "Password updated successfully!" }`;
     }
 catch (error)
     {
      return `{ "type": "NULL", "warning": "Error hashing the password: ${error.message}" }`;
     }
}

// Function adjusts event group dialog, remove duplicates, rename profiles adding modifier keys and removing event selection, modifier keys checkbox and attribute text field
function AdjustEventGroupDialog(dialog)
{
 let addedgroups = 0, addedevents = 0, overwrittenevents = [];
 const groups = funcs.GetDialogElement(dialog, 'eventgroups', true);
 if (!groups) return;

 for (const groupname in groups)
     {
      if (funcs.CompareOptionInSelectElement(groupname, 'New event group')) continue; // First go through all event groups excluding 'New event group' template
      let newgroupname = funcs.AdjustProfileOption(groups, groupname); // Remove profile cloned flag
      newgroupname ? addedgroups++ : newgroupname = groupname; // For cloned event group profile - increase <addeedgroups> counter, <newgroupname> is set to current anyway
      const events = funcs.GetDialogElement(groups[newgroupname], 'evsel', true); // Get current event group profile
      if (!events) return;

      for (let eventname in events) // and go through all events in current event group
          {
           if (funcs.CompareOptionInSelectElement(eventname, 'New event')) continue;
           let neweventname = funcs.AdjustProfileOption(events, eventname); // Remove profile cloned flag
           if (!neweventname) continue; // and continue if event is not cloned
           addedevents++; // Increase appropriate counter 
           eventname = neweventname; // and fix current event in <eventname>
           neweventname = funcs.GetDialogElement(events[neweventname], 'events', true); // Then start making new event profile name that consists of client event name (mouse/keyboard/misc) plus modifier keys or profile name if needed
           if (!neweventname) return;
           delete events[eventname].events; // Delete current event profile event-selection element
           if (consts.MOUSEEVENTS.includes(neweventname) || consts.KEYBOARDEVENTS.includes(neweventname)) // add modifier keys to event profile name (example: KEYB+CTRL+ALT)
              {
               const modifier = funcs.GetDialogElement(events[eventname], 'modifier', false);
               if (!modifier) return;
               neweventname += `${modifier.Ctrl ? '+CTRL' : ''}${modifier.Alt ? '+ALT' : ''}${modifier.Shift ? '+SHIFT' : ''}`;
              }
           if (consts.CALLBACKEVENTS.includes(neweventname)) neweventname += ' ' + eventname.split(consts.FIELDSDIVIDER, 1)[0]; else delete events[eventname].attr; // or add profile name (when it was created) for callback events to event profile name (example: ONTIMER Schedule)
           for (const currentname in events) // New event profile name is made, so search duplicated ones and increase appropriate cunter in case
               {
                if (!funcs.CompareOptionInSelectElement(currentname, neweventname)) continue;
                overwrittenevents.push(neweventname);
                delete events[currentname];
                break;
               }
           delete events[eventname].modifier; // Remove modifier checkbox element
           if (funcs.CompareOptionInSelectElement(eventname, neweventname)) continue;
           events[neweventname + consts.FIELDSDIVIDER + '-'] = events[eventname]; // and rename event profile
           delete events[eventname]; // removing the old one
          }
     }
 return `Added event groups: ${addedgroups}\nAdded events: ${addedevents}\n${overwrittenevents.length ? 'Warning - next ' + overwrittenevents.length + ' event profile(s) was(were) overwritten:\n' + overwrittenevents.join('\n') : ''}`; // Return profile changes stat at the end
}

// Function return element data for OD 'Users' objects, args: eventname - ADDOBJECT|DOUBLECLICK|KEYF2|CONFIRMDIALOG, eid - element id inited the event, eventdata - input event data, userfrom - user name inited the event, userto - username the data is set for
// Todo0 - timebased users, user 'expiry date' is set and then scheduler runs through all these account and remove them
export async function Userset(eventname, eid, eventdata, userfrom, userto)
{
 if (!['ADDOBJECT', 'DOUBLECLICK', 'KEYF2', 'CONFIRMDIALOG'].includes(eventname)) return;

 switch (eid)
        {
         case '1': // Username element - <eventdata> acts as a user name, so set it as an element value excluding non-symbol chars with '!'. Username is unchangable after creation, so handle only ADDOBJECT event
              if (eventname === 'ADDOBJECT') return `{ "type": "SET", "data": "${eventdata.replace(/\W|\!/g, '')}" }`;
              return `{ "type": "NULL", "warning": "You can't change user '${userto}' name after creation!" }`;

         case '2': // Password - changeble by the own user (or super user) only. Todo0 - check login with no pass set or empty pass at 
              if (eventname === 'ADDOBJECT') return await HashPassword(eventdata, eventdata);
              if (userfrom !== consts.SUPERUSER && userfrom !== userto) return `{ "type": "NULL", "warning": "You can't change password for other users (${userto})!" }`;
              if (eventname === 'CONFIRMDIALOG') return await HashPassword(eventdata?.newpass?.data, eventdata?.confirm?.data);
              eventdata = { title: { type: 'title', data: `User '${userto}' password change` }, newpass: { type: 'password', head: 'Input new password', data: '' }, confirm: { type: 'password', head: 'Confirm new password', data: '' }, ok: JSON.parse(consts.BUTTONOK), cancel: JSON.parse(consts.BUTTONCANCEL) };
              return `{ "type": "DIALOG", "data": "${JSON.stringify(eventdata)}" }`;

         case '3': // Info dialog - such as name, tel, email, foto, other info.. Changeble for all users
              if (eventname === 'ADDOBJECT') eventdata = { title: { type: 'title', data: `User info` }, ok: JSON.parse(consts.BUTTONOK), cancel: JSON.parse(consts.BUTTONCANCEL),
                                                           name: { type: 'text', head: 'User name', data: eventdata },
                                                           email: { type: 'text', head: 'User email', data: '' },
                                                           phone: { type: 'textarea', head: 'User phone number', data: '' },
                                                           custom: { type: 'textarea', head: 'User custom info', data: '' }, };
              return `{ "type": "${['ADDOBJECT', 'CONFIRMDIALOG'].includes(eventname) ? 'SET' : 'DIALOG'}", "data": ${JSON.stringify(eventdata)} }`;

         case '4': // Policy dialog - changable for super user only and super user of itself doesn't have policy settings
              if (userfrom !== consts.SUPERUSER && userfrom !== userto && eventname === 'CONFIRMDIALOG') return `{ "type": "NULL", "warning": "You can't change policy settings for other users (${userto})!" }`;
              if (userto === consts.SUPERUSER) return `{ "type": "NULL", "warning": "User '${consts.SUPERUSER}' as a super user has no any restrictions, so policy settings are not available!" }`;
              if (eventname === 'ADDOBJECT') eventdata = { title: { type: 'title', data: 'Policy settings' }, ok: JSON.parse(consts.BUTTONOK), cancel: JSON.parse(consts.BUTTONCANCEL),
                                                           groups: { type: 'textarea', head: 'Groups~Enter group names one by line the user belongs to. User groups are defined here only and act as kind of user tags in any user specific permission/restriction settings. Any names in that kind of settings are interpreted as user names, in case of no user name found - as a group name', data: '' },
                                                           instances: { type: 'text', head: 'Logged-in instances~Zero value disables login and SCHEDULE event from the user. Empty/incorrect value - no instances limit', data: '1' },
                                                           timeout: { type: 'text', head: 'Idle timout~Timeout in minutes after the user is logged out. Empty/incorrect/zero value - no timeout', data: '720', flag: '*' },
                                                           read: { type: 'textarea', head: "Restrict user READ access to next OD/OV id combinations~Enter OD id and OV id divided via some spaces or tab one by line for each combination. Char '!' inverts the match, absent OV id matches all views of specified OD. This per user restriction has a a higher priority than OVs reaad access restriction. Example: '1 2' - OV 2 of OD 1 is unaccessable (no read access) for the user, '3 !4' - any OV except OV with id 4 of OD 3 is unaccessable (another words user has read acccess to OV with id 4 only, '5' - all views of OD 5 are unaccessable for the user", data: '' },
                                                           write: { type: 'textarea', head: "Restrict user WRITE access to next OD/OV id combinations~See READ access restriction hint above", data: '' },
                                                           create: { type: 'checkbox', data: 'Restrict the user to create OD' },
                                                           task: { type: 'checkbox', data: 'Restrict the user to run Task Manager' }, };
              return `{ "type": "${['ADDOBJECT', 'CONFIRMDIALOG'].includes(eventname) ? 'SET' : 'DIALOG'}", "data": ${JSON.stringify(eventdata)} }`;

         case '5': // GUI customization dialog - all new users are created with default customization. Good practice is not to change super user customization, so other users can use it via 'force' option in user-customization dialog. Changeble for own users only
              if (userfrom !== consts.SUPERUSER && userfrom !== userto && eventname === 'CONFIRMDIALOG') return `{ "type": "NULL", "warning": "You can't change customization settings for other users (${userto})!" }`;
              if (eventname === 'ADDOBJECT') eventdata = consts.CUSTOMIZATIONDIALOG;
              return `{ "type": "${['ADDOBJECT', 'CONFIRMDIALOG'].includes(eventname) ? 'SET' : 'DIALOG'}", "data": ${JSON.stringify(eventdata)} }`;

         case '6': // Event group profiler dialog - changeble for super user only
              if (userto !== consts.SUPERUSER) return `{ "type": "NULL", "warning": "Event group settings are available for super user only!" }`;
              if (userfrom !== consts.SUPERUSER && eventname === 'CONFIRMDIALOG') return `{ "type": "NULL", "warning": "Event group settings change is available for super user only!" }`;
              if (eventname === 'ADDOBJECT') eventdata = consts.EVENTGROUPDIALOG;
              let warning;
              if (eventname === 'CONFIRMDIALOG') if (typeof (warning = AdjustEventGroupDialog(eventdata)) !== 'string') return `{ "type": "NULL", "warning": "Incorrect event group settings, so cannot be applied!" }`;
              if (warning) warning = `, "warning": "${warning}"`
              return `{ "type": "${['ADDOBJECT', 'CONFIRMDIALOG'].includes(eventname) ? 'SET' : 'DIALOG'}", "data": ${JSON.stringify(eventdata)}${warning} }`;
        }
}

// Function wraps incoming <data> with to event type <eventype> and row event data or JSON of <element.prop> if exists
export async function Dataset(data, element, clienteventtype, controllereventtype)
{
 const eventtypes = ['ADDOBJECT', 'KEYDelete', 'CONFIRMEDIT', 'CONFIRMDIALOG'];
 if (!eventtypes.includes(clienteventtype)) throw new error(`Unsupported client event '${clienteventtype}'!`); // Check events the module function can handle on
 if (clienteventtype === 'KEYDelete') data = ''; // Clear data for 'Delete' key
 element = JSON.parse(element); // Element is a macro eid and eprop, so parse it to retreive element 'prop' to write
 controllereventtype = controllereventtype || 'UPDATE'; // Adjust event type
 controllereventtype = controllereventtype.trim();      // Adjust event type
 controllereventtype = controllereventtype || 'UPDATE'; // Adjust event type
 return 'prop' in element ? `{"type": "${type}", "data": { "${prop}": "${data}" } }` : `{"type": "${type}","data": "${data}" } }`; // Set oid/eid/[eprop] value to <data>
}
