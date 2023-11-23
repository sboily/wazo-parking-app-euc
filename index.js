import { App } from 'https://cdn.jsdelivr.net/npm/@wazo/euc-plugins-sdk@0.0.20/lib/esm/app.js';

let url;
let session;

const app = new App();

const parkingList = document.getElementById('parking');

app.onIframeMessage = (msg) => {
  switch(msg.name) {
    case "parking_parked_call":
      addCallInParking(msg);
      break;
    case "parking_unparked_call":
      removeCallInParking(msg);
      break;
    case "parking_parked_call_give_up":
      removeCallInParking(msg);
      break;
    case "parking_parked_call_swap":
      console.log('SWAP !!!');
      break;
    case "parking_parked_call_timeout":
      removeCallInParking(msg);
      break;
    case "call_answered":
      addCall(msg);
      break;
    case "call_updated":
      updateCall(msg);
      break;
    case "call_ended":
      removeCall(msg);
      break;
  }
};

const updateCall = (payload) => {
  const call_id = payload.data.call_id;
  const conversation_id = payload.data.conversation_id;
  const talking_to_id = Object.keys(payload.data.talking_to);
  if (conversation_id == call_id) {
    setParkingBtn(call_id, talking_to_id); 
  }
};

const setParkingBtn = (call_id, talking_to_id) => {
  const btnParkCall = document.getElementById(`btn-park-${call_id}`);
  if (btnParkCall) {
    btnParkCall.id = talking_to_id;
    setEventParkingBtn(btnParkCall.id);
  };
};

const removeCall = (payload) => {
  const call_id = payload.data.call_id;
  const row = document.getElementById(call_id);
  if (row) {
    row.parentNode.removeChild(row);
  }
};

const addCall = (payload) => {
  const participant = payload.data;
  const currentCallsTableBody = document.getElementById('currentCalls');
  const park_call_id = participant.conversation_id;

  currentCallsTableBody.innerHTML += `
    <tr id=${participant.call_id}>
      <td>${participant.caller_id_name}</td>
      <td>${participant.caller_id_number}</td>
      <td><button id=btn-park-${park_call_id}>Park call</button></td>
    </tr>
  `;

   setEventParkingBtn(park_call_id);

};

// Remove old eventListener
const setEventParkingBtn = (park_call_id) => {
  const btnParkCall = document.getElementById(`btn-park-${park_call_id}`);
  if (btnParkCall) {
    btnParkCall.addEventListener('click', async (event) => {
      const btnId = event.target.id;
      const parkCallId = btnId.split('-').pop();
      await parkCall('parkinglot-1', parkCallId);
    });
  };
};

const removeCallInParking = (payload) => {
  const participant = `park-${payload.data.parkee_uniqueid}`;
  const row = document.getElementById(participant);
  row.parentNode.removeChild(row);
};

const addCallInParking = (payload) => {
  const participant = payload.data;
  const parkingTableBody = document.getElementById('parkingCalls');

  parkingTableBody.innerHTML += `
    <tr id=park-${participant.parkee_uniqueid}>
      <td>${participant.parking_space}</td>
      <td>${participant.parkee_caller_id_name || '-'}</td>
      <td>${participant.parkee_caller_id_num}</td>
      <td>${participant.parkee_connected_line_name || '-'}</td>
      <td>${participant.parkee_connected_line_num}</td>
      <td>${participant.parking_duration}</td>
      <td>${participant.parking_timeout}</td>
    </tr>
  `;

};

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

const parkCall = async (parkingLot, call_id) => {
  const payload = {
    call_id: call_id
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

const displayParking = (parking) => {
  let tableRows = '<tr><td colspan="6">No parking found.</td></tr>';

  if (parking.length) {
    tableRows = parking
      .map(
        (park) => `
        <tr>
            <td>${park.name}</td>
            <td>${park.extensions[0].exten}</td>
            <td>${park.slots_start}</td>
            <td>${park.slots_end}</td>
            <td>${park.timeout}</td>
            <td>${park.music_on_hold}</td>
        </tr>
    `,
      )
      .join('');
  };

  parkingList.innerHTML = `
    <table class="mui-table mui-table--bordered">
      <thead>
        <tr>
          <th>Name</th>
          <th>Extension</th>
          <th>Slot start</th>
          <th>Slot end</th>
          <th>TimeOut</th>
          <th>Music</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  parkingList.innerHTML += `
    <table class="mui-table mui-table--bordered">
      <thead>
        <tr>
          <th>Caller ID Name</th>
          <th>Caller ID Num</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="currentCalls"></tbody>
    </table>
  `;

  parkingList.innerHTML += `
    <table class="mui-table mui-table--bordered">
      <thead>
        <tr>
          <th>Space</th>
          <th>Caller ID Name</th>
          <th>Caller ID Num</th>
          <th>Callee ID Name</th>
          <th>Callee ID Num</th>
          <th>Duration</th>
          <th>TimeOut</th>
        </tr>
      </thead>
      <tbody id="parkingCalls"></tbody>
    </table>
  `;

};

(async() => {
  await app.initialize();
  const context = app.getContext();
  session = context.user;
  url = context.user.host;

  const parkingRes = await getParkingList();
  displayParking(parkingRes.items);
})();
