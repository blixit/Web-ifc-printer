'use strict';

angular.module('myApp.view1', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/view1', {
    templateUrl: 'view1/view1.html',
    controller: 'View1Ctrl'
  });
}])

.controller('View1Ctrl',
    ['$scope', '$window','mySocket', function($scope, $window,mySocket) {
      //variable de la scene threejs
      var _camera, _scene, _renderer, _trackball;

      //envoie de donnée au serveur
      var sendRequest = function(request){
        mySocket.emit('client_data', {'letter': request});
        console.log("sendRequest("+request+")");
      };

      var mat; //material
      //taille du viewer threejs
      var headerSize = 70;
      var rightMenuRatio = 245;



      var _entities = [];

      initUI();
      initGL();
      animate();

      function initUI()
      {

        // Setup the dnd listeners.
        var dropZone = document.getElementById('dropzone');
        dropZone.addEventListener('dragover', onFileDragOver, false);
        dropZone.addEventListener('drop', onFileDrop, false);
      }

      function onFileDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        // Explicitly show this is a copy
        evt.dataTransfer.dropEffect = 'copy';
      }

      function onFileDrop(evt) {



        evt.stopPropagation();
        evt.preventDefault();

        var file = evt.dataTransfer.files[0];

        var splits = file.name.split('.');

        if (splits[splits.length - 1] == 'json') {

          var reader = new FileReader();

          reader.readAsBinaryString(file);

          reader.onload = function (event) {

            var meshEntityList = JSON.parse(event.target.result);

            //createScene(meshEntityList);
          };

          reader.onerror = function (event) {
            alert('Cannot read file!');
          };

          reader.readAsText(file);
        }
        else if (splits[splits.length - 1] == 'mtl') {
          var mtlLoader = new THREE.MTLLoader();

          var reader = new FileReader();
          reader.readAsBinaryString(file);
          reader.onload = function (event) {

            mat = mtlLoader.parse(event.target.result);
            mat.preload();
            console.log(mat)
          };


        }
        else if (splits[splits.length - 1] == 'ifc') {
	console.log(evt.dataTransfer.files[0]);
          var reader = new FileReader();
          reader.readAsBinaryString(file);
          reader.onload = function (event) {
		console.log("J'upload un IFC");
		var data = {data:event.target.result,
				name:evt.dataTransfer.files[0].name};
              mySocket.emit('upload', data);
          };
        }
        else{



          var reader = new FileReader();
          reader.readAsBinaryString(file);
          reader.onload = function (event) {
            var loaderB = new THREE.OBJLoader();
            loaderB.setMaterials(mat);
            var obj = loaderB.parse(event.target.result);
            clearScene();

            _camera.fov = 40;
            _camera.position.x = 0;
            _camera.position.y = 0;
            _camera.position.z = 30;

            _scene.add( obj );
            console.log("c'est un OBJ");
            }
        }
      }


      /*
      function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        // Explicitly show this is a copy
        evt.dataTransfer.dropEffect = 'copy';
      }

      function ConvertClr(clr) {
        var bytes = [];

        bytes[0] = (clr >>> 24) & 0xFF; //R
        bytes[1] = (clr >>> 16) & 0xFF; //G
        bytes[2] = (clr >>> 8) & 0xFF;  //B
        bytes[3] = (clr >>> 0) & 0xFF;  //A

        return bytes[2] | (bytes[1] << 8) | (bytes[0] << 16);
      }
 */
      function clearScene()
      {
        for (var i = 0; i < _entities.length; i++) {
          _scene.remove(_entities[i]);
        }

        _entities = [];
      }

      //for a JSON file
      /*function createScene(meshDataList){

        clearScene();

        _camera.fov = 40;
        _camera.position.x = 0;
        _camera.position.y = 0;
        _camera.position.z = 30;

        var center = [0.0, 0.0, 0.0];

        var len = meshDataList.length;

        for (var meshIdx = 0; meshIdx < len; meshIdx++) {

          var meshData = meshDataList[meshIdx];

          var geometry = new THREE.Geometry();

          var vertexArray = [];

          //uncompress vertices array
          for (var i = 0; i < meshData.VertexIndices.length; i += 1) {

            var idx = 3 * meshData.VertexIndices[i];

            vertexArray[i] = new THREE.Vector3(
                meshData.VertexCoords[idx],
                meshData.VertexCoords[idx + 1],
                meshData.VertexCoords[idx + 2]);
          }

          var normalArray = [];

          //uncompress normals array
          for (var i = 0; i < meshData.NormalIndices.length; i += 1) {

            var idx = 3 * meshData.NormalIndices[i];

            normalArray[i] = new THREE.Vector3(
                meshData.Normals[idx],
                meshData.Normals[idx + 1],
                meshData.Normals[idx + 2]);
          }

          //Generate Faces
          for (var i = 0; i < vertexArray.length; i += 3) {

            geometry.vertices.push(vertexArray[i]);
            geometry.vertices.push(vertexArray[i + 1]);
            geometry.vertices.push(vertexArray[i + 2]);

            var face = new THREE.Face3(i, i + 1, i + 2)

            geometry.faces.push(face);

            face.vertexNormals.push(normalArray[i]);
            face.vertexNormals.push(normalArray[i + 1]);
            face.vertexNormals.push(normalArray[i + 2]);
          }

          center[0] += meshData.Center[0];
          center[1] += meshData.Center[1];
          center[2] += meshData.Center[2];

          var material = new THREE.MeshLambertMaterial(
              {
                color: ConvertClr(meshData.Color[0]),
                shading: THREE.SmoothShading
              });

          var body = new THREE.Mesh(geometry, material);

          body.doubleSided = false;

          body.geometry.dynamic = true;
          body.geometry.__dirtyVertices = true;
          body.geometry.__dirtyNormals = true;

          var entity = new THREE.Object3D();

          entity.add(body);

          _entities.push(entity);

          _scene.add(entity);
        }

        center[0] = center[0] / len;
        center[1] = center[1] / len;
        center[2] = center[2] / len;

        for (var i = 0; i < _entities.length; i++) {
          _entities[i].applyMatrix(new THREE.Matrix4().makeTranslation(
              -center[0],
              -center[1],
              -center[2]));
        }
      };*/

      function hasWebGL() {
        try {
          var canvas = document.createElement('canvas');
          var ret =
              !!(window.WebGLRenderingContext &&
                  (canvas.getContext('webgl') ||
                  canvas.getContext('experimental-webgl'))
              );
          return ret;
        }
        catch (e) {
          return false;
        };
      }

      function initGL() {
        //no_scene = no_scene || true;
        var animateWithWebGL = hasWebGL();

        var container = document.getElementById("GLDiv");

        _scene = new THREE.Scene();
        if($window.innerWidth<800){
          var width = $window.innerWidth - 20;
        }
        else{
          var width = $window.innerWidth - rightMenuRatio -20;


          var height = $window.innerHeight;
        }

        _camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);

        //var controls = new THREE.MouseControls(_camera);
        //controls.movementSpeed = 10;
        //controls.lookSpeed = 1;
        //controls.rollSpeed = 0;
        //controls.autoForward = false;
        _camera.position.x = 0;
        _camera.position.y = -100;
        _camera.position.z = 30;

        _scene.add(_camera);

        _trackball = new THREE.TrackballControls(_camera, container);
        _trackball.rotateSpeed = 2.0;
        _trackball.zoomSpeed = 1.0;
	    _trackball.target.z = 150;
        _trackball.panSpeed = 0.5;
        _trackball.noZoom = false;
        _trackball.noPan = false;
        _trackball.target.set(0, 0, 0);
       // _trackball.staticMoving = true;
        _trackball.dynamicDampingFactor = 0.3;
        _trackball.minDistance = 1;
        _trackball.maxDistance = 300;
        _trackball.keys = [82, 90, 80]; // [r:rotate, z:zoom, p:pan]
        _trackball.addEventListener('change', render);

        // create lights
        var light1 = new THREE.PointLight(0x969696);
        var light2 = new THREE.PointLight(0xFFFFFF);
        var light3 = new THREE.PointLight(0x969696);
        var light4 = new THREE.PointLight(0xCCCCC0);

        light1.position.x = 100;
        light1.position.y = 100;
        light1.position.z = 200;

        light2.position.x = -100;
        light2.position.y = 150;
        light2.position.z = -200;

        light3.position.x = 100;
        light3.position.y = -150;
        light3.position.z = -100;

        light4.position.x = -100;
        light4.position.y = -150;
        light4.position.z = 150;

        _scene.add(light1);
        _scene.add(light2);
        _scene.add(light3);
        _scene.add(light4);

        _renderer = new THREE.WebGLRenderer({ antialiasing: true }/*{ alpha: true }*/);  //CanvasRenderer();
        _renderer.setSize(width, height);
        _renderer.setClearColor( 0x000, 0);

        //_projector = new THREE.Projector();

        container.appendChild(_renderer.domElement);

        //document.addEventListener('mousewheel', onDocumentMouseWheel, false);

        var container = document.getElementById("GLDiv");
      }
/*
      function onDocumentMouseWheel(event) {
        _camera.fov -= event.wheelDeltaY * 0.05;

        if (_camera.fov < 10.0) {
          _camera.fov = 10.0;
        }

        if (_camera.fov > 180.0) {
          _camera.fov = 180.0;
        }

        _camera.updateProjectionMatrix();

        render();
      }

*/
      function animate() {
        requestAnimationFrame(animate);
        _trackball.update();
        render();
      }

      function render() {
        _renderer.render(_scene, _camera);
      }

      $window.addEventListener( 'resize', onWindowResize, false );

        function onWindowResize(){

        if($window.innerWidth<800){
          _camera.aspect = ($window.innerWidth  - 20 ) / ($window.innerHeight);
          _camera.updateProjectionMatrix();

          _renderer.setSize( $window.innerWidth  - 20 , $window.innerHeight);
        }
          else{
          _camera.aspect = ($window.innerWidth  -rightMenuRatio ) / ($window.innerHeight - headerSize);
          _camera.updateProjectionMatrix();

          _renderer.setSize( $window.innerWidth  -rightMenuRatio , $window.innerHeight - headerSize);
        }
      }


$scope.menuRightStyle = {'background-color': '#bbf242','width':(rightMenuRatio-20)+'px'};

$scope.layers = [];

      $scope.goOBJ = function(fp) {
        loadOBJ(fp,mat);
      };

      $scope.goMTL = function(fp) {
        readMTL(fp);
      };

      $scope.SplitFileAndGetList = function(fp) {
        sendRequest(fp);
        console.log("hello : "+fp);
        mySocket.on("server_data", function(data){
          var OBJData = data.data;
          if(data.data === 0){
            console.log('this ifc does not exist!!');
          }else{
            console.log(data.data);
            for (var part in data.parts){
              var currentList = $scope.layers;
              var newList = currentList.concat({name:data.parts[part]});
              $scope.layers = newList;
            }
          }});
      };

      function readMTL(filepath){
        var mtlData;
        sendRequest(filepath+".ifc.mtl");
        mySocket.on("server_data", function(data_mtl){
          if(data_mtl.data === 0){
            console.log('this mtl does not exist!!');
            mtlData = "erreur";
          }else{
            var mtlLoader = new THREE.MTLLoader();
            mtlData = mtlLoader.parse(data_mtl.data);
            //mtlData.preload();
            mat = mtlData;
            }});
      }
      function loadOBJ(filepath,mtl){
        sendRequest(filepath+".ifc.obj");
        mySocket.on("server_data", function(objData){
          if(objData.data === 0){
            console.log('this OBJ does not exist!!');
          }else{
            var loaderOBJ = new THREE.OBJLoader();
            mtl.preload();
            loaderOBJ.setMaterials(mtl);
            var objModel = loaderOBJ.parse(objData.data);
            clearScene();
            objModel.material = mtl.materials;
            objModel.name = filepath;
            _scene.add( objModel );
          }});
}

      function readFromServer(filepath){
        //NOT WORKING DUE TO INFINITE LOOP
        //first load the mtl
        readMTL(filepath);

        //then load the obj
        loadOBJ(filepath,mat);
      }

      $scope.cleanTheScene = function(){
        for( var i = _scene.children.length - 1; i >= 0; i--){
          var obj = _scene.children[i];
          //select only the meshes
          if (obj.type == "Group"){
            _scene.remove(obj); //and kill it!
          }
        }
        console.log("I've clean it, at your orders Sir!")
      };

      $scope.deleteObject = function(name){
        for( var i = _scene.children.length - 1; i >= 0; i--){
          var obj = _scene.children[i];
          //select only the good obj
          console.log(obj.name);
            if(obj.name===name){
              _scene.remove(obj); //and kill it!
            }
          }
        animate();
        console.log("I've clean it, at your orders Sir!")
      };

      $scope.filepath = "1";
      $scope.selectFile = function(fp){
        console.log(fp.match(/[A-Z][a-z]+/g[0]));
        $scope.filepath = fp.split('.')[-1] + "/" + fp.split('.')[0];
        $scope.goMTL($scope.filepath);
      };


      $('#toggle').click(function() {
        $(this).toggleClass('expanded').siblings('div').slideToggle();
      });


    }]);
