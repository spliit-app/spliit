result=$(docker ps | grep spliit-db)
if [ $? -eq 0 ];
then
    echo "spliit-db is already running, doing nothing"
else
    echo "spliit-db is not running, starting it"
    docker rm spliit-db --force
    mkdir -p postgres-data
    docker run --name spliit-db -d -p 5432:5432 -e POSTGRES_PASSWORD=1234 -v "/$(pwd)/postgres-data:/var/lib/postgresql" postgres
    sleep 5 # Wait for spliit-db to start
fi