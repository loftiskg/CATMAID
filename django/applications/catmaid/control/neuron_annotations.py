import json, sys

from django.http import HttpResponse
from django.db.models import Q

from catmaid.models import *
from catmaid.control.authentication import *
from catmaid.control.common import *


@requires_user_role([UserRole.Browse])
def query_neurons_by_annotations(request, project_id=None):
    
    neurons = ClassInstance.objects.filter(class_column__class_name = 'neuron')
    print >> sys.stderr, 'Starting with ' + str(len(neurons)) + ' neurons.'
    for key in request.POST:
        if key.startswith('neuron_query_by_annotation'):
            neurons = neurons.filter(cici_via_b__relation__relation_name = 'annotated_with',
                                     cici_via_b__class_instance_a__name = request.POST[key])
            print >> sys.stderr, str(len(neurons)) + ' after adding '  + request.POST[key] + '.'
        elif key == 'neuron_query_by_annotator':
            userID = int(request.POST[key])
            if userID >= 0:
                neurons = neurons.filter(cici_via_b__relation__relation_name = 'annotated_with',
                                         cici_via_b__user = userID)
                print >> sys.stderr, str(len(neurons)) + ' after adding user '  + str(userID) + '.'
            
    dump = [];
    for neuron in neurons:
        skeletons = ClassInstanceClassInstance.objects.filter(
            class_instance_b = neuron,
            relation__relation_name = 'model_of')
        skeleton = skeletons[0].class_instance_a
        tn = Treenode.objects.get(
            project=project_id,
            parent__isnull=True,
            skeleton_id=skeleton.id)
        dump += [{'id': neuron.id, 'name': neuron.name, 'skeleton_id': skeleton.id, 'root_node': tn.id}]
        # TODO: include node count, review percentage, etc.
    return HttpResponse(json.dumps(dump))

