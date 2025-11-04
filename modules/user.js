//

function AddUser(element, value)
{
 switch (element)
        {
         case 'username':
              return `{ "cmd": "SET", "data": "${value}" }`;
         case 'policy':
			  return {
                      title: { type: 'title', data: 'Policy settings' },
                      groups: { type: 'textarea', head: 'Groups~Enter group names one by line the user belongs to. User groups are defined here only and act as kind of user tags in any user specific permission/restriction settings. Any names in that kind of settings are interpreted as user names, in case of no user name - as a group name', data: '' },
                      instances: { type: 'text', head: 'Logged-in instances~Empty/incorrect/zero value disables login and SCHEDULE event from the user. For all, except super user root', data: '1' },
                      timeout: { type: 'text', head: 'Idle timout~Timeout in minutes after the user is logged out. Empty/incorrect/zero value - min value of 5 minutes is used', data: '720', flag: '*' },
                      read: { type: 'textarea', head: "Restrict user READ access to next OD/OV id combinations~Enter OD id and OV id divided via some spaces or tab one by line for each combination. Char '!' inverts the match, absent OV id matches all views of specified OD. This per user restriction has a a higher priority than OVs reaad access restriction. Example: '1 2' - OV 2 of OD 1 is unaccessable (no read access) for the user, '3 !4' - any OV except OV with id 4 of OD 3 is unaccessable (another words user has read acccess to OV with id 4 only, '5' - all views of OD 5 are unaccessable for the user", data: '' },
                      write: { type: 'textarea', head: "Restrict user WRITE access to next OD/OV id combinations~See READ access restriction hint above", data: '' },
                      create: { type: 'checkbox', data: 'Restrict the user to create OD' },
                      run: { type: 'checkbox', data: 'Restrict the user to run Task Manager' },
                     };
         case 'macroses':
			  return {
                      title: { type: 'title', data: 'Macroses' },
                      macroses: { type: 'select', flag: '+Enter new macros name', head: `Macros list~User macros list is an optional list of some text data associated with the specified macros, which may be used in any database configuration settings via js style quoted expression \${<macros name>}. Macroses may be nested, so one macros may contain another. Macros loops, when one macros contains another that contains first one, are ignored. Loop case calculation value is set to empty string - when one macros contains another that contains first, this another macros receives an empty string as a first macros value`,
                                  data: { 'New macros~+-': { 10: { type: 'textarea', head: 'Macros value', data: '' },
                                                             20: { type: 'textarea', head: 'Macros description', flag: '*', data: '' }
                                                           }
                                        }
                                }

                     };
         case 'customization':
              return;
         case 'events':
              return;
        }
}

    //44: { type: 'select', head: 'Event list~Event list is a list client events, each event has its name, modifier keys and other settings. To create new event (the handler below will be called on) just clone "New event template"', data: { 'New event template': {
    //50: { type: 'select', head: 'Select event', data: CLIENTEVENTS.join(OPTIONSDIVIDER) },
    //60: { type: 'checkbox', head: 'Select modifier key~For the mouse and keyboards events only. Also note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved by client app (browser), so may not cancel client side default behaviour and may never occur', data: 'Ctrl/Alt/Shift/Meta', flag: '*' },
