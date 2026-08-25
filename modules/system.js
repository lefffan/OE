import argon2 from 'argon2';
import * as consts from '../static/consts.js';
import * as funcs from '../static/funcs.js';

// Password correctness check and hashing. Todo0 - add uppercase/lowercase letters and digits presence check
async function HashPassword(newpass, confirmpass)
{
 if (typeof newpass !== 'string' || typeof confirmpass !== 'string' || newpass !== confirmpass) return `{ "type": "WARNING", "data": "Confirm password doesn't match the password!" }`;
 if (newpass.length < consts.USERPASSMINLENGTH) return `{ "type": "WARNING", "data": "User password must be min ${consts.USERPASSMINLENGTH} chars length!" }`;

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
      return `{ "type": "WARNING", "data": "Error hashing the password: ${error.message}" }`;
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
      if (funcs.CompareOptionInSelectElement(groupname, 'New event group')) continue;
      let newgroupname = funcs.AdjustProfileOption(groups, groupname);
      newgroupname ? addedgroups++ : newgroupname = groupname;
      const events = funcs.GetDialogElement(groups[newgroupname], 'evsel', true);
      if (!events) return;

      for (let eventname in events)
          {
           if (funcs.CompareOptionInSelectElement(eventname, 'New event')) continue;
           let neweventname = funcs.AdjustProfileOption(events, eventname);
           if (!neweventname) continue;
           addedevents++;
           eventname = neweventname;
           neweventname = funcs.GetDialogElement(events[neweventname], 'events', true);
           if (!neweventname) return;
           delete events[eventname].events;
           if (consts.MOUSEEVENTS.includes(neweventname) || consts.KEYBOARDEVENTS.includes(neweventname))
              {
               const modifier = funcs.GetDialogElement(events[eventname], 'modifier', false);
               if (!modifier) return;
               neweventname += `${modifier.Ctrl ? '+CTRL' : ''}${modifier.Alt ? '+ALT' : ''}${modifier.Shift ? '+SHIFT' : ''}${modifier.Meta ? '+META' : ''}`;
              }
           if (consts.CALLBACKEVENTS.includes(neweventname)) neweventname += ' ' + eventname.split(consts.FIELDSDIVIDER, 1)[0]; else delete events[eventname].attr;
           for (const currentname in events)
               {
                if (!funcs.CompareOptionInSelectElement(currentname, neweventname)) continue;
                overwrittenevents.push(neweventname);
                delete events[currentname];
                break;
               }
           delete events[eventname].modifier;
           if (funcs.CompareOptionInSelectElement(eventname, neweventname)) continue;
           events[neweventname + consts.FIELDSDIVIDER + '-'] = events[eventname];
           delete events[eventname];
          }
     }
 return `Added event groups: ${addedgroups}\nAdded events: ${addedevents}\n${overwrittenevents.length ? 'Warning - next ' + overwrittenevents.length + ' event profile(s) was(were) overwritten:\n' + overwrittenevents.join('\n') : ''}`;
}

// Function return element data for OD 'Users' objects, args: eventname - ADDOBJECT|DOUBLECLICK|KEYF2|CONFIRMDIALOG, eid - element id inited the event, eventdata - input event data, userfrom - user name inited the event, userto - username the data is set for
export async function Userset(eventname, eid, eventdata, userfrom, userto)
{
 if (!['ADDOBJECT', 'DOUBLECLICK', 'KEYF2', 'CONFIRMDIALOG'].includes(eventname)) return;

 switch (eid)
        {
         case '1': // Username element - <eventdata> acts as a user name, so set it as an element value excluding non-symbol chars with '!'. Username is unchangable after creation, so handle only ADDOBJECT event
              if (eventname === 'ADDOBJECT') return `{ "type": "SET", "data": "${eventdata.replace(/\W|\!/g, '')}" }`;
              return `{ "type": "WARNING", "data": "You can't change user '${userto}' name after creation!" }`;

         case '2': // Password - changeble by the own user (or super user) only. Todo0 - check login with no pass set or empty pass at 
              if (eventname === 'ADDOBJECT') return await HashPassword(eventdata, eventdata);
              if (userfrom !== consts.SUPERUSER && userfrom !== userto) return `{ "type": "WARNING", "data": "You can't change password for other users (${userto})!" }`;
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
              if (userfrom !== consts.SUPERUSER && userfrom !== userto && eventname === 'CONFIRMDIALOG') return `{ "type": "WARNING", "data": "You can't change policy settings for other users (${userto})!" }`;
              if (userto === consts.SUPERUSER) return `{ "type": "WARNING", "data": "User '${consts.SUPERUSER}' as a super user has no any restrictions, so policy settings are not available!" }`;
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
              if (userfrom !== consts.SUPERUSER && userfrom !== userto && eventname === 'CONFIRMDIALOG') return `{ "type": "WARNING", "data": "You can't change customization settings for other users (${userto})!" }`;
              if (eventname === 'ADDOBJECT') eventdata = consts.CUSTOMIZATIONDIALOG;
              return `{ "type": "${['ADDOBJECT', 'CONFIRMDIALOG'].includes(eventname) ? 'SET' : 'DIALOG'}", "data": ${JSON.stringify(eventdata)} }`;

         case '6': // Event group profiler dialog - changeble for super user only
              if (userto !== consts.SUPERUSER) return `{ "type": "WARNING", "data": "Event group settings are available for super user only!" }`;
              if (userfrom !== consts.SUPERUSER && eventname === 'CONFIRMDIALOG') return `{ "type": "WARNING", "data": "Event group settings change is available for super user only!" }`;
              if (eventname === 'ADDOBJECT') eventdata = consts.EVENTGROUPDIALOG;
              let warning;
              if (eventname === 'CONFIRMDIALOG') if (typeof (warning = AdjustEventGroupDialog(eventdata)) !== 'string') return `{ "type": "WARNING", "data": "Incorrect event group settings, so cannot be applied!" }`;
              if (warning) warning = `, "warning": "${warning}"`
              return `{ "type": "${['ADDOBJECT', 'CONFIRMDIALOG'].includes(eventname) ? 'SET' : 'DIALOG'}", "data": ${JSON.stringify(eventdata)}${warning} }`;
        }
}

// Function wraps incoming <data> with to event type <eventype> and row event data or JSON of <element.prop> if exists
export async function Dataset(data, element, clienteventtype, controllereventtype)
{
 try {
      const eventtypes = ['ADDOBJECT', 'KEYDelete', 'CONFIRMEDIT', 'CONFIRMDIALOG'];
      if (!eventtypes.includes(clienteventtype)) throw new error(`Unsupported client event '${clienteventtype}'!`);
      if (clienteventtype === 'KEYDelete') data = '';
      element = JSON.parse(element); // Element is a macro eid and eprop, so parse it to retreive element 'prop' to write
      controllereventtype = controllereventtype || 'UPDATE'; // Adjust event type
      controllereventtype = controllereventtype.trim();      // Adjust event type
      controllereventtype = controllereventtype || 'UPDATE'; // Adjust event type
      return 'prop' in element ? `{"type": "${type}", "data": { "${prop}": "${data}" } }` : `{"type": "${type}","data": "${data}" } }`;
     }
 catch(error)
     {
      console.log(`Dataset function execution error: ${error.message}`);
      return;
     }
}

// selection not event group profile but event profile
// value in layout has permanent status and no SET event from the contorllwe may change it
// initial root event group profile dialog
// release all event chain from handler to the conrtoller and then to client side with 'MUTE' add to all SET events