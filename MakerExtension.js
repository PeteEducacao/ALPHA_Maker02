(function(ext){
	var device = null;
	var rawData = null;
	var notifyConnection = false;
	 
	var active = true;
	var comWatchdog = null;
	var comPoller = null;
	 
	var valA = 0;
	var idA = 0;
	var valB = 0;
	var idB = 0;
	var valC = 0;
	var idC = 0;
	var valD = 0;
	var idD = 0;
	 
	ext.resetAll = function(){}
	 
	function appendBuffer(buffer1, buffer2){
		var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
		tmp.set(new Uint8Array(buffer1), 0);
		tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
		return tmp.buffer;
	}
	 
	ext.MakerConectada = function(){
		if(notifyConnection)
			return true;
		return false;
	}
	 
	ext.readSensor = function(sensor, type){
		var retVal;
	 	if(sensor == 'S1'){
	 		retVal = valA;
	 	}
	 	if(sensor == 'S2'){
	 		retVal = valB;
	 	}
	 	if(sensor == 'S3'){
	 		retVal = valC;
	 	}
	 	if(sensor == 'S4'){
	 		retVal = valD;
	 	}
	 	
	 	//['Digital', 'Light', 'Sound', 'Temperature', 'Resistance', 'Voltage', 'Distance']
	 	//Digital
	 	if(type == menus[lang]['types'][0])
	 		return retVal
	 	//Light
	 	if(type == menus[lang]['types'][1])
	 		return convertToLux(retVal);
	 	//Sound
	 	if(type == menus[lang]['types'][2])
	 		return convertToDb(retVal);
	 	//Temperature
	 	if(type == menus[lang]['types'][3])
	 		return convertToCelsius(retVal);
	 	//Resistance
	 	if(type == menus[lang]['types'][4])
	 		return convertToOhm(retVal);
	 	//Voltage
	 	if(type == menus[lang]['types'][5])
	 		return convertToVolts(retVal);
	 	//Distance
	 	if(type == menus[lang]['types'][6])
	 		return convertToCentimeters(retVal);
	 	return 0;
	}
	 
	ext.setServo = function(servo, angle){
	 	var sendServo =new Uint8Array(7);
		sendServo[0] = 77; //M
		sendServo[2] = 13; //\r
		sendServo[6] = 13; //\r
		
		if(angle < 0)
			angle = 0;
		if(angle > 180)
			angle = 180;
		sendServo[3] = angle / 100 + 48;
		sendServo[4] = (angle % 100) / 10 + 48;
		sendServo[5] = angle % 10 + 48;
		
		if(servo == 'SV1')
			sendServo[1] = 111; //o
		if(servo == 'SV2')
			sendServo[1] = 112; //p
			
		device.send(sendServo.buffer);
	}
	 
	ext.setMotor = function(motor, direction, power){
	 	var sendMotor =new Uint8Array(7);
		sendMotor[0] = 77; //M
		sendMotor[2] = 13; //\r
		sendMotor[6] = 13; //\r
			
		if(power < 0)
			power = 0;
		if(power > 100)
			power = 100;
		if(direction == menus[lang]['directions'][1])
			power = power + 128;
		if(direction == menus[lang]['directions'][2])
			power = 0;
		sendMotor[3] = power / 100 + 48;
		sendMotor[4] = (power % 100) / 10 + 48;
		sendMotor[5] = power % 10 + 48;
			
		if(motor == "ME")
			sendMotor[1] = 101 //e
		if(motor == "MD")
			sendMotor[1] = 100 //d
		
		device.send(sendMotor.buffer);
	}
		 
	ext.playSound = function(frequency){
		var sendSound =new Uint8Array(9);
		sendSound[0] = 77; //M
		sendSound[1] = 77; //M
		sendSound[2] = 13; //\r
		sendSound[8] = 13; //\r
			
		if(frequency < 0)
			frequency = 0;
		if(frequency > 10000)
			frequency = 10000;
		sendSound[3] = frequency / 10000 + 48;
		sendSound[4] = (frequency % 10000) / 1000 + 48;
		sendSound[5] = (frequency % 1000) / 100 + 48;
		sendSound[6] = (frequency % 100) / 10 + 48;
		sendSound[7] = frequency % 10 + 48;
		
		device.send(sendSound.buffer);
	}
		 
	ext.mute = function(){
		var sendMute =new Uint8Array(3);
		sendMute[0] = 77; //M
		sendMute[1] = 109; //m
		sendMute[2] = 13; //\r
		
		device.send(sendMute.buffer);
	}
	
	function convertToOhm(val){
		if(val < 10)
			val = 0;
		if(val > 1012)
			val = 1023;
		return Math.round(100000 * (1023 - val) / val);
	}
	
	function convertToCelsius(val){
		return Math.round((3970 / (Math.log(-(110 / 111 * (val - 1023)) / val) + 3970 / 298.15)) - 273.15);
	}
		
	function convertToVolts(val){
		return Math.round((6.47959 - (val * 5 / 294)) * 10) / 10;
	}
	
	function convertToLux(val){
		return Math.round(50 * val / (2700000 / 127 *0.00076725))/10;
	}
	
	function convertToDb(val){
		return Math.round(10 * ((0.0491 * val) + 40)) / 10;
	}
	
	function convertToCentimeters(val){
		return Math.round(val * 0.2);
	}

	 //*************************************************************
	
	 var potentialDevices = [];
	 ext._deviceConnected = function(dev){
		potentialDevices.push(dev);
		console.log('Aqui 1. ');
		if(!device){
			console.log('Aqui 2. ');
			tryNextDevice();
		}
	}

	function checkMaker(bytes){
		var data = String.fromCharCode.apply(null, bytes);
		console.log('Data: ' + data);
		var t_index = data.indexOf('t');
		var l_index = data.indexOf('l');
		if(t_index >= 0 && l_index >= 0){
			t_index ++;
			l_index ++;
			var kernelVersion = data.substring(t_index, t_index + 4);
			var legalVersion = data.substring(l_index, l_index + 4);

			console.log('Kernel: ' + kernelVersion);
			console.log('Legal: ' + legalVersion);

			if(kernelVersion >= 106 && legalVersion >= 108){
				notifyConnection = true;
				return true;
			}
		}
		return false;
	}
	
	var inputArray = [];
	function processData(){
		var bytes = new Uint8Array(rawData);
		
		if(watchdog){
			if(checkMaker(bytes)){
				console.log('Found Maker')
				rawData = null;
				
				//Reconhece como sendo uma Maker
				clearTimeout(watchdog);
				watchdog = null;
				clearInterval(poller);
				poller = null;
				
				if(!comPoller && !comWatchdog){
					var startAcquisition =new Uint8Array(5);
					startAcquisition[0] = 77; //M
					startAcquisition[1] = 115; //s
					startAcquisition[2] = 49; //1
					startAcquisition[3] = 48; //0
					startAcquisition[4] = 13; //\r
					
					console.log('Starting acquisition');
					device.send(startAcquisition.buffer);
						
					comPoller = setInterval(function(){
						var resend =new Uint8Array(3);
						resend[0] = 77; //M
						resend[1] = 86; //V
						resend[2] = 13; //\r
						console.log('Requesting values'); //Aqui 6
						device.send(resend.buffer);
					}, 200);
				
					active = true;
					comWatchdog = setInterval(function(){
						if(active)
							active = false
						else{
							clearInterval(comPoller);
							comPoller = null;
							
							clearInterval(comWatchdog);
							comWatchdog = null;
							
							device.set_receive_handler(null);
							device.close();
							device = null;
							tryNextDevice();
						}
					}, 1000);
				}
			}
		}
		
		if(comPoller && comWatchdog){
			if(decodeMessage(bytes)){
				rawData = null;
				active = true;
			}
		}
	}
	 
	function decodeMessage(bytes){
	 	var data = String.fromCharCode.apply(null, bytes);
	 	//IDs
		var idA_index = data.indexOf('A');
		var idB_index = data.indexOf('B');
		var idC_index = data.indexOf('C');
		var idD_index = data.indexOf('D');
		
		var valA_index = data.indexOf('a');
		var valB_index = data.indexOf('b');
		var valC_index = data.indexOf('c');
		var valD_index = data.indexOf('d');
		if(idA_index >= 0 && idB_index >= 0 && idC_index >= 0 && idD_index >= 0 && valA_index >= 0 && valB_index >= 0 && valC_index >= 0 && valD_index >= 0){
			var index;
			idA_index ++;
			idB_index ++;
			idC_index ++;
			idD_index ++;
			
			valA_index ++;
			valB_index ++;
			valC_index ++;
			valD_index ++;
			
			//Get S1
			index = data.indexOf('\r', idA_index);
			idA = data.substring(idA_index, index);
			index = data.indexOf('\r', valA_index);
			valA = data.substring(valA_index, index);
			
			//Get S2
			index = data.indexOf('\r', idB_index);
			idB = data.substring(idB_index, index);
			index = data.indexOf('\r', valB_index);
			valB = data.substring(valB_index, index);
			
			//Get S3
			index = data.indexOf('\r', idC_index);
			idC = data.substring(idC_index, index);
			index = data.indexOf('\r', valC_index);
			valC = data.substring(valC_index, index);
			
			//Get S4
			index = data.indexOf('\r', idD_index);
			idD = data.substring(idD_index, index);
			index = data.indexOf('\r', valD_index);
			valD = data.substring(valD_index, index);
		
			/*console.log('A: ' + idA);
			console.log('B: ' + idB);
			console.log('C: ' + idC);
			console.log('D: ' + idD);
			console.log('a: ' + valA);
			console.log('b: ' + valB);
			console.log('c: ' + valC);
			console.log('d: ' + valD);*/
			return true;
		}
		return false;
	}


	var poller = null;
	var watchdog = null;
	function tryNextDevice(){
		//If potentialDevices is empty, device will be undefined.
		//That will get us back here next time a device is connected.
		device = potentialDevices.shift();
		if(!device) return;
		device.open({ stopBits: 0, bitRate: 9600, ctsFlowControl: 0 });
		
		device.set_receive_handler(function(data){
			if(!rawData || rawData.byteLength == 2) rawData = new Uint8Array(data);
			else rawData = appendBuffer(rawData, data);

			if(rawData.byteLength >= 2){
				 processData();
			}
		});

		//Envia Mn
		var pingCmd = new Uint8Array(3);
		pingCmd[0]= 77;//'M';
		pingCmd[1]= 110; //'n';
		pingCmd[2] = 13;
		//poller = setInterval(function(){
		poller = setTimeout(function(){
			console.log('Sending Mn'); //Aqui 6
			device.send(pingCmd.buffer);
		}, 500);
		
		watchdog = setTimeout(function(){
			console.log('Watchdog triggered'); //Aqui 7
			//This device didn't get good data in time, so give up on it. Clean up and then move on.
			//If we get good data then we'll terminate this watchdog.
			clearInterval(poller);
			poller = null;
			device.set_receive_handler(null);
			device.close();
			device = null;
			tryNextDevice();
		}, 5000);
	}

	 //*************************************************************
	ext._deviceRemoved = function(dev){
		console.log('_deviceRemoved');
		if(device != dev)
			return;
		if(poller)
			poller = clearInterval(poller);
		if(comPoller)
			comPoller = clearInterval(comPoller);
		if(comWatchdog)
			comWatchdog = clearInterval(comWatchdog);
		device = null;
		notifyConnection = false;
	}

	ext._shutdown = function(){
		if(device){
		 	var sendFinish =new Uint8Array(3);
			sendFinish[0] = 77; //M
		 	sendFinish[1] = 102; //f
			sendFinish[2] = 13; //\r
			device.send(sendFinish.buffer);
		
			device.close();
		}
		if(poller)
			poller = clearInterval(poller);
		if(comPoller)
			comPoller = clearInterval(comPoller);
		if(comWatchdog)
			comWatchdog = clearInterval(comWatchdog);
		device = null;
	}

	ext._getStatus = function(){
		if(!device)
			return{status: 0, msg: 'Maker disconnected'};
		if(watchdog)
			return{status: 1, msg: 'Searching for Maker'};
		return{status: 2, msg: 'Maker connected'};
	}

	 //************************************************************
	 //Block and block menu descriptions
	 //Check for GET param 'lang'
	var paramString = window.location.search.replace(/^\?|\/$/g, '');
	var vars = paramString.split("&");
	var lang = 'en';
	for (var i = 0; i < vars.length; i++){
		var pair = vars[i].split('=');
		if(pair.length > 1 && pair[0] == 'lang')
			lang = pair[1];
	}
	var blocks = {
		en: [
			['h', 'When ALPHA Maker is connected', 'MakerConectada'],
			['-'],
			['r', 'Read sensor %m.sensor as %m.types', 'readSensor', 'S1', 'Digital'],
			[' ', 'Servo %m.servo %n °', 'setServo', 'SV1', '0'],
			[' ', 'Motor %m.motor %m.directions %n %', 'setMotor', 'ME', 'forward', '0'],
			[' ', 'Play sound %n Hz', 'playSound', '1000'],
			[' ', 'Mute', 'mute']
		],
		pt: [
			['h', 'Quando ALPHA Maker for conectada', 'MakerConectada'],
			['-'],
			['r', 'Ler Sensor %m.sensor como %m.types', 'readSensor', 'S1', 'Digital'],
			[' ', 'Servo %m.servo %n °', 'setServo', 'SV1', '0'],
			[' ', 'Motor %m.motor %m.directions %n %', 'setMotor', 'ME', 'frente', '0'],
			[' ', 'Tocar som %n Hz', 'playSound', '1000'],
			[' ', 'Mudo', 'mute']
		]
	};
	
	var menus = {
		en: {
			sensor: ['S1', 'S2', 'S3', 'S4'],
			types: ['Digital', 'Light (Lux)', 'Sound (dB)', 'Temperature (°C)', 'Resistance (Ohm)', 'Voltage (V)', 'Distance (cm)'],
			servo: ['SV1', 'SV2'],
			motor: ['ME', 'MD'],
			directions: ['forward', 'backward', 'stop']
		},
		pt: {
			sensor: ['S1', 'S2', 'S3', 'S4'],
			types: ['Digital', 'Luz (Lux)', 'Som (dB)', 'Temperatura (°C)', 'Resistência (Ohm)', 'Tensão (V)', 'Distância (cm)'],
			servo: ['SV1', 'SV2'],
			motor: ['ME', 'MD'],
			directions: ['frente', 'ré', 'pare']
		}
	};
	var descriptor = {
		blocks: blocks[lang],
		menus: menus[lang]
	};
	ScratchExtensions.register('ALPHA Maker', descriptor, ext,{type: 'serial'});
})({});
