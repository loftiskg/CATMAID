#!/bin/bash

# Get environment configuration or use defaults if unavailable.
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-catmaid}
DB_USER=${DB_USER:-catmaid_user}
DB_PASS=${DB_PASS:-catmaid_password}
CM_EXAMPLE_PROJECTS=${CM_EXAMPLE_PROJECTS:-true}
CM_IMPORTED_SKELETON_FILE_MAXIMUM_SIZE=${CM_IMPORTED_SKELETON_FILE_MAXIMUM_SIZE:-""}

TIMEZONE=`readlink /etc/localtime | sed "s/.*\/\(.*\)$/\1/"`

# Check if the first argument begins with a dash. If so, prepend "platform" to
# the list of arguments.
if [ "${1:0:1}" = '-' ]; then
    set -- platform "$@"
fi

init_catmaid () {
  echo "Wait until database $DB_HOST:$DB_PORT is ready..."
  until nc -z $DB_HOST $DB_PORT
  do
      sleep 1
  done

  # Wait to avoid "panic: Failed to open sql connection pq: the database system is starting up"
  sleep 1

  echo "Loading virtualenv"
  source /usr/share/virtualenvwrapper/virtualenvwrapper.sh
  workon catmaid

  if [ ! -f /home/django/projects/mysite/settings.py ]; then
    echo "Setting up CATMAID"

    cp /home/django/configuration.py.example /home/django/configuration.py
    sed -i -e "s?^\(abs_catmaid_path = \).*?\1'/home'?g" /home/django/configuration.py
    sed -i -e "s?^\(abs_virtualenv_python_library_path = \).*?\1'/opt/virtualenvs/catmaid/local/lib/python2.7/site-packages'?g" /home/django/configuration.py
    sed -i -e "s?^\(catmaid_database_host = \).*?\1'${DB_HOST}'?g" /home/django/configuration.py
    sed -i -e "s?^\(catmaid_database_port = \).*?\1'${DB_PORT}'?g" /home/django/configuration.py
    sed -i -e "s?^\(catmaid_database_name = \).*?\1'${DB_NAME}'?g" /home/django/configuration.py
    sed -i -e "s?^\(catmaid_database_username = \).*?\1'${DB_USER}'?g" /home/django/configuration.py
    sed -i -e "s?^\(catmaid_database_password = \).*?\1'${DB_PASS}'?g" /home/django/configuration.py
    sed -i -e "s?^\(catmaid_timezone = \).*?\1'${TIMEZONE}'?g" /home/django/configuration.py
    sed -i -e "s?^\(catmaid_servername = \).*?\1'*'?g" /home/django/configuration.py
    cd /home/django && python create_configuration.py
    mkdir -p /home/django/static
  fi

  cd /home/django/projects

  # Update maximum import size setting
  sed -i "/^\(IMPORTED_SKELETON_FILE_MAXIMUM_SIZE = \).*/d" mysite/settings.py
  if [ ! -z "${CM_IMPORTED_SKELETON_FILE_MAXIMUM_SIZE}" ]; then
    echo "Setting IMPORTED_SKELETON_FILE_MAXIMUM_SIZE = ${CM_IMPORTED_SKELETON_FILE_MAXIMUM_SIZE}"
    echo "IMPORTED_SKELETON_FILE_MAXIMUM_SIZE = ${CM_IMPORTED_SKELETON_FILE_MAXIMUM_SIZE}" >> mysite/settings.py
  fi

  # Create database and databsae user if not yet present. This should only
  # happen if the database is not run in a separete container.
  echo "Testing database access"
  if ! PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -w; then
    echo "Initialize CATMAID database"
    /home/scripts/createuser.sh ${DB_NAME} ${DB_USER} ${DB_PASS} | runuser -l postgres -c 'psql -h "${DB_HOST}" -p "${DB_PORT}"'
  fi

  # Migrate the database, collect static files and create a superuser.
  echo "Migrating databse"
  python manage.py migrate --noinput
  echo "Updating static files"
  python manage.py collectstatic --clear --noinput

  # The additional new lines are needed to end the input stream
  echo "Ensuring existence of super user"
  printf '\n\n' | cat /home/scripts/docker/create_superuser.py - | python manage.py shell

  if [ "$CM_EXAMPLE_PROJECTS" = true ]; then
    python manage.py catmaid_insert_example_projects --user=1
  fi

  echo "Starting CATMAID"
  supervisord -n
}

if [ "$1" = 'standalone' ]; then
  if ! grep -Fxq "local ${DB_NAME} ${DB_USER} md5" /etc/postgresql/9.6/main/pg_hba.conf
  then
      echo "Updating Postgres access configuration"
      sed -i "/# DO NOT DISABLE!/ilocal ${DB_NAME} ${DB_USER} md5" /etc/postgresql/9.6/main/pg_hba.conf
      service postgresql restart
  fi
  echo "Starting Nginx"
  service nginx start
  init_catmaid
elif [ "$1" = 'platform' ]; then
  init_catmaid
else
    exec "$@"
fi
