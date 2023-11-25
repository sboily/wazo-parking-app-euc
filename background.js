import { App } from 'https://cdn.jsdelivr.net/npm/@wazo/euc-plugins-sdk@0.0.22/lib/esm/app.js';
import 'https://cdn.jsdelivr.net/npm/@wazo/sdk';


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

  return fetch(`https://${url}/api/calld/1.0/parking`, options).then(response => response.json());
};

const getParkingCallList = async (parkingLot) => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    }
  };

  return fetch(`https://${url}/api/calld/1.0/parking/${parkingLot}`, options).then(response => response.json());
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

const parkCall = async (parkingLot, call_id, callback_channel, parkTimeout) => {
  const payload = {
    call_id: call_id,
    callback_channel: callback_channel,
    timeout: parkTimeout
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    },
    body: JSON.stringify(payload)
  };

  return fetch(`https://${url}/api/calld/1.0/parking/${parkingLot}`, options).then(response => response.json());
};



// Need to be fixed on EUC SDK
Wazo.Websocket.ws.on('onmessage', payload => {
  const msg = JSON.parse(payload).data;
  switch(msg.name) {
    case "parking_parked_call":
    case "parking_unparked_call":
    case "parking_parked_call_give_up":
    case "parking_parked_call_swap":
    case "parking_parked_call_timeout":
    case "call_answered":
    case "call_updated":
      answer_call_id = msg.data.conversation_id;
    case "call_ended":
      app.sendMessageToIframe(msg);
      break;
  }
});

app.onCallAnswered = (call) =>  {
  const div = document.createElement("div");
  div.className = 'div-btn-parking';
  const button = document.createElement("button");
  button.textContent = 'P';
  button.className = 'btn-parking';
  button.addEventListener('click', async () => {
      const call_id = answer_call_id;
      const parkTimeout = 45;
      const parkingLot = "parkinglot-1";
      const callback_channel = endpoints[1].name;
      await parkCall(parkingLot, call_id, callback_channel, parkTimeout);
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
