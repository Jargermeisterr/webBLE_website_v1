const connectButton = document.getElementById('connectBleButton');
const disconnectButton = document.getElementById('disconnectBleButton');

const retrievedValue1 = document.getElementById('valueContainer1');
const retrievedValue2 = document.getElementById('valueContainer2');
const retrievedValue3 = document.getElementById('valueContainer3');
const retrievedValue4 = document.getElementById('valueContainer4');

const bleStateContainer = document.getElementById('bleState');
const timestampContainer = document.getElementById('timestamp');

//Define BLE Device Specs
var deviceName ='ESP32_EM_BLE';
var bleService = '89f25314-409b-43a7-8572-7ad2be8043d3';
var bleCharacteristic = 'c2387018-413e-4ebd-a05e-9a7dbd4513f7';

var bleServer;
var bleServiceFound;
var bleCharacteristicFound;

// Connect Button (search for BLE Devices only if BLE is available)
connectButton.addEventListener('click', (event) => {
    if (isWebBluetoothEnabled()){
        connectToDevice();
    }
});

// Disconnect Button
disconnectButton.addEventListener('click', disconnectDevice);

// Check if BLE is available in your Browser
function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log("Web Bluetooth API is not available in this browser!");
            bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser/device!";
            return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
};

function handleCharacteristicChange(event) {
    const value = event.target.value;
    let decodedValue = "";
    
    // Decode thủ công từng byte sang ký tự (An toàn 100% trên Bluefy)
    for (let i = 0; i < value.byteLength; i++) {
        decodedValue += String.fromCharCode(value.getUint8(i));
    }
    
    console.log("Characteristic value changed: ", decodedValue);

    // Tách chuỗi bằng ký tự phân tách '|'
    // Ví dụ: "Normal|98.54|12|450" -> ["Normal", "98.54", "12", "450"]
    const dataParts = decodedValue.split('|');

    // Kiểm tra xem chuỗi nhận được có đủ 4 thành phần hay không
    if (dataParts.length === 4) {
        const label = dataParts[0];
        const confidence = dataParts[1];
        const inferenceTime = dataParts[2];
        const inferenceCount = dataParts[3];

        // Cập nhật từng giá trị riêng biệt lên giao diện HTML
        retrievedValue1.innerHTML = label;
        retrievedValue2.innerHTML = confidence + "%"; // Thêm ký tự % cho trực quan
        retrievedValue3.innerHTML = inferenceTime + " ms"; // Thêm đơn vị ms
        retrievedValue4.innerHTML = inferenceCount;
    } else {
        // Trường hợp chuỗi lỗi hoặc không đúng định dạng mong muốn
        console.warn("Dữ liệu nhận được không đúng định dạng:", decodedValue);
        
        // Hiển thị chuỗi thô để dễ debug nếu cần
        retrievedValue1.innerHTML = decodedValue;
        retrievedValue2.innerHTML = "Err";
        retrievedValue3.innerHTML = "Err";
        retrievedValue4.innerHTML = "Err";
    }
    
    // Cập nhật thời gian nhận mẫu cuối cùng
    timestampContainer.innerHTML = getDateTime();
}

// Connect to BLE Device and Enable Notifications
function connectToDevice(){
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        filters: [{name: deviceName}],
        optionalServices: [bleService]
    })
    .then(device => {
        console.log('Device Selected:', device.name);
        bleStateContainer.innerHTML = 'Connected to device ' + device.name;
        bleStateContainer.style.color = "#24af37";
        device.addEventListener('gattserverdisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(gattServer =>{
        bleServer = gattServer;
        console.log("Connected to GATT Server");
        return bleServer.getPrimaryService(bleService);
    })
    .then(service => {
        bleServiceFound = service;
        console.log("Service discovered:", service.uuid);
        return service.getCharacteristic(bleCharacteristic);
    })
    .then(characteristic => {
        console.log("Characteristic discovered:", characteristic.uuid);
        bleCharacteristicFound = characteristic;
        
        // Lắng nghe sự kiện
        characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
        
        // Phải return Promise này để đợi nó setup xong
        return characteristic.startNotifications(); 
    })
    .then(() => {
        console.log("Notifications Started Successfully.");
    })
    .catch(error => {
        console.log('Error: ', error);
        window.alert('Error: ' + error.message); 
    })
};

function disconnectDevice() {
    console.log("Disconnect Device.");
    if (bleServer && bleServer.connected) {
        if (bleCharacteristicFound) {
            bleCharacteristicFound.stopNotifications()
                .then(() => {
                    console.log("Notifications Stopped");
                    return bleServer.disconnect();
                })
                .then(() => {
                    console.log("Device Disconnected");
                    bleStateContainer.innerHTML = "Device Disconnected";
                    bleStateContainer.style.color = "#d13a30";

                })
                .catch(error => {
                    console.log("An error occurred:", error);
                });
        } else {
            console.log("No characteristic found to disconnect.");
        }
    } else {
        // Throw an error if Bluetooth is not connected
        console.error("Bluetooth is not connected.");
        window.alert("Bluetooth is not connected.")
    }
};

function onDisconnected(event){
    console.log('Device Disconnected:', event.target.device.name);
    bleStateContainer.innerHTML = "Device disconnected";
    bleStateContainer.style.color = "#d13a30";

    connectToDevice();
}

function getDateTime() {
    var currentdate = new Date();
    var day = ("00" + currentdate.getDate()).slice(-2); // Convert day to string and slice
    var month = ("00" + (currentdate.getMonth() + 1)).slice(-2);
    var year = currentdate.getFullYear();
    var hours = ("00" + currentdate.getHours()).slice(-2);
    var minutes = ("00" + currentdate.getMinutes()).slice(-2);
    var seconds = ("00" + currentdate.getSeconds()).slice(-2);

    var datetime = day + "/" + month + "/" + year + " at " + hours + ":" + minutes + ":" + seconds;
    return datetime;
}