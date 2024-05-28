FROM postgis/postgis:16-3.4

RUN "apt update && apt install build-essential libreadline-dev zlib1g-dev flex bison git postgresql-server-dev-16"
RUN "git clone https://github.com/apache/age.git"
RUN "cd age && make install"


# This might not work
