mViewer(Micro/Mongo Viewer) is a light (read web based like Futon for couchdb) GUI for mongo db which does not need any install steps.

### Current Features are:

   1. Managed db and collections (usual add/drop of collections and drop of db)
   2. Viewing collection and db stats (count, size, storage et al)
   3. query executor
   4. Mongo stats

### Download and Use

Download the package from here https://github.com/Imaginea/mViewer/downloads

Unzip/Untar it and run the script/batch (with +x permission).

>
> $./start_mviewer.sh \<port\> 
>

or

> 
> \>start_mviewer.bat \<port\>
>

<port> is optional, if not given it'll take the default port from properties file.


### How to Build


#### Method 1
Run build.xml using ant, target is start. It will create a war and run it using the winstone server, you can access the application at http://localhost:<port-no>. You can change the port no. in mViewer.properties file. Default port is 8080

#### Method 2 (Windows Users)
Run mViewer.bat It will create a war and run it using the winstone server, you can access the application at http://localhost:<port-no>. You can change the port no. in mViewer.properties file. Default port is 8080.


#### Method 3 (For Other Servlet-Containers)

For building a distributable unit run the target dist, since the default target is also set as dist, just running ant should suffice. dist would create a deployable war in the staging directory, which by default is at the same level as the src folder.
This war can be deployed on to tomcat 7x, other server integration can be provided on demand.

Once the war is deployed go to the url http://<server-ip>:<http-port>/mViewer


Eagerly waiting for feature requests and bug reports
Team Imaginea

