result=$(docker ps | grep spliit-db)
if [ $? -eq 0 ];
then
    echo "postgres is already running, doing nothing"
else
    echo "postgres is not running, starting it"
    docker rm postgres --force
    mkdir -p postgres-data
    docker run --name spliit-db -d -p 5432:5432 -e POSTGRES_PASSWORD=1234 -v "/$(pwd)/postgres-data:/var/lib/postgresql/data" postgres
    sleep 5 # Wait for postgres to start
fi
