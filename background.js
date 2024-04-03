import { App } from 'https://cdn.jsdelivr.net/npm/@wazo/euc-plugins-sdk@0.0.23/lib/esm/app.js';
import 'https://cdn.jsdelivr.net/npm/@wazo/sdk@0.40.4/dist/wazo-sdk.min.js'

let session;
let url;
let endpoints = [];
let answer_call_id;

const app = new App();

const getParkingList = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    }
  };

  return fetch(`https://${url}/api/confd/1.1/parkinglots`, options).then(response => response.json());

};

const getParkingCallList = async (parkingLot) => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    }
  };

  return fetch(`https://${url}/api/calld/1.0/parkinglots/${parkingLot}`, options).then(response => response.json());
};

const getCallsList = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    }
  };

  return fetch(`https://${url}/api/calld/1.0/users/me/calls`, options).then(response => response.json());
};

const parkCall = async (parkingLot, callId, callbackChannel, parkTimeout) => {
  const payload = {
    call_id: callId,
    parking_id: parkingLot,
    callback_channel: callbackChannel,
    timeout: parkTimeout,
    prefered_slot: null
  };

  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    },
    body: JSON.stringify(payload)
  };

  return fetch(`https://${url}/api/calld/1.0/users/me/calls/${callId}/park`, options).then(response => response.json());
};



// Need to be fixed on EUC SDK
Wazo.Websocket.ws.on('onmessage', payload => {
  const msg = JSON.parse(payload).data;
  switch(msg.name) {
    case "call_parked":
    case "call_unparked":
    case "parked_call_hungup":
    case "parked_call_timed_out":
    case "call_answered":
      // FIXME: We need to improve the information in call object
      answer_call_id = msg.data.call_id;
    case "call_updated":
      // FIXME: We need to improve the information in call object
      answer_call_id = msg.data.call_id;
    case "call_ended":
      app.sendMessageToIframe(msg);
      break;
  }
});

// FIXME: We need to improve the information in call object
app.onCallAnswered = (call) =>  {
  addParkingButtonOnCall(call);
};

// FIXME: We need to improve the information in call object
app.onCallMade = (call) =>  {
  addParkingButtonOnCall(call);
};

// FIXME: We need to add method on our SDK to help people to create button or other widget to control a call
// FIXME: Remove hardcoded information and also find a way to know what is the callback channel we want to use.
const addParkingButtonOnCall = (call) => {
  const div = document.createElement("div");
  div.className = 'div-btn-parking';
  const button = document.createElement("button");
  button.textContent = 'P';
  button.className = 'btn-parking';
  button.addEventListener('click', async () => {
      const call_id = answer_call_id;
      const parkTimeout = 45;
      const parkingLot = "1"; // FIXME: We need to find a way to know what is the parking lot we want to use.
      const callback_channel = endpoints[1].name;
      await parkCall(parkingLot, call_id, callback_channel, parkTimeout);
      app.displayNotification("Parking action", "Call has been parked successfully!");
    });

  div.appendChild(button);
  document.querySelector('div.videoIsMinimized').appendChild(div);
};

const addStyle = (() => {
  const style = document.createElement('style');
  document.head.append(style);
  return (styleString) => style.textContent = styleString;
})();

app.onBackgroundMessage = async (msg) => {
  switch(msg.name) {
    case "getParkingList":
      msg = await getParkingList();
      app.sendMessageToIframe({name: "getParkingList", data: msg});
      break;
    case "getCallsList":
      msg = await getCallsList();
      app.sendMessageToIframe({name: "getCallsList", data: msg});
      break;
    case "getParkingCallList":
      msg = await getParkingCallList(msg.value);
      app.sendMessageToIframe({name: "getParkingCallList", data: msg});
      break;
    case "parkCall":
      await parkCall(...msg.value);
      break;
  };
};

const populateEndpoints = (lines) => {
  for (let i = 0; i < lines.length; i++) {
    let value = lines[i];
    if (value.endpointSip) {
      endpoints.push({id: i+1, name: `PJSIP/${value.endpointSip.name}`});
    };
  };
};

(async () => {
  await app.initialize();
  const context = app.getContext();
  session = context.user;
  url = context.user.host;

  app.displayBanner({
    url: `${context.app.extra.baseUrl}/banner.html`,
    height: "50px",
    width: "100px",
    hideCloseButton: false
  });

  populateEndpoints(session.profile.lines);

  addStyle(`
    .btn-parking {
      border: none;
      color: white;
      text-decoration: none;
      display: inline-block;
      font-size: 25px;
      margin-left: -465px;
      width: 40px;
      height: 40px;
      background-color: #4CAF50;
      border-radius: 50%;
      text-align: center;
      line-height: 40px;
      cursor: pointer;
    }
  `);

  console.log('parking background - background launched');
})();
