import { QueryClient } from '@tanstack/react-query';
import { VehiclePositionUpdate, ShipmentEventData, DispatchEventData, IncidentEventData, AlertEventData } from './events';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;

export function createEventHandlerMap(queryClient: QueryClient, toast?: ToastFn) {
  return {
    handleEvent: (event: string, data: unknown) => {
      switch (event) {
        case 'vehicles.positions': {
          const updates = Array.isArray(data) ? (data as VehiclePositionUpdate[]) : [data as VehiclePositionUpdate];
          
          // Patch 'vehicles' query data without triggering network refetches
          queryClient.setQueriesData({ queryKey: ['vehicles'] }, (old: any) => {
            if (!old) return old;
            const content = old.content || (Array.isArray(old) ? old : null);
            if (!content || !Array.isArray(content)) return old;

            const updateMap = new Map(updates.map((u) => [u.vehicleId, u]));
            const updatedList = content.map((v: any) => {
              const u = updateMap.get(v.id);
              if (!u) return v;
              return {
                ...v,
                lat: u.lat,
                lng: u.lng,
                heading: u.heading !== undefined ? u.heading : v.heading,
                speedKmph: u.speedKmph !== undefined ? u.speedKmph : v.speedKmph,
                lastSeen: new Date().toISOString(),
              };
            });

            return old.content ? { ...old, content: updatedList } : updatedList;
          });

          // Also patch individual vehicle queries if active
          updates.forEach((u) => {
            queryClient.setQueryData(['vehicle', u.vehicleId], (old: any) => {
              if (!old) return old;
              return {
                ...old,
                lat: u.lat,
                lng: u.lng,
                heading: u.heading !== undefined ? u.heading : old.heading,
                speedKmph: u.speedKmph !== undefined ? u.speedKmph : old.speedKmph,
                lastSeen: new Date().toISOString(),
              };
            });
          });
          break;
        }

        case 'vehicle.update': {
          const u = data as VehiclePositionUpdate;
          if (u && u.vehicleId) {
            queryClient.setQueriesData({ queryKey: ['vehicles'] }, (old: any) => {
              if (!old) return old;
              const content = old.content || (Array.isArray(old) ? old : null);
              if (!content || !Array.isArray(content)) return old;

              const updatedList = content.map((v: any) => {
                if (v.id !== u.vehicleId) return v;
                return {
                  ...v,
                  lat: u.lat,
                  lng: u.lng,
                  heading: u.heading !== undefined ? u.heading : v.heading,
                  speedKmph: u.speedKmph !== undefined ? u.speedKmph : v.speedKmph,
                  lastSeen: new Date().toISOString(),
                };
              });

              return old.content ? { ...old, content: updatedList } : updatedList;
            });

            queryClient.setQueryData(['vehicle', u.vehicleId], (old: any) => {
              if (!old) return old;
              return {
                ...old,
                lat: u.lat,
                lng: u.lng,
                heading: u.heading !== undefined ? u.heading : old.heading,
                speedKmph: u.speedKmph !== undefined ? u.speedKmph : old.speedKmph,
                lastSeen: new Date().toISOString(),
              };
            });
          }
          break;
        }

        case 'shipment.created': {
          const s = data as ShipmentEventData;
          queryClient.invalidateQueries({ queryKey: ['shipments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          if (toast) {
            toast(`New shipment ${s.code || '#' + s.id} created`, 'info');
          }
          break;
        }

        case 'shipment.updated': {
          const s = data as ShipmentEventData;
          queryClient.invalidateQueries({ queryKey: ['shipments'] });
          queryClient.invalidateQueries({ queryKey: ['shipment', s.id] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          if (toast && s.status) {
            toast(`Shipment #${s.id} is now ${s.status}`, 'info');
          }
          break;
        }

        case 'user.registered': {
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
          if (toast) {
            toast('New user registered', 'info');
          }
          break;
        }

        case 'shipment.assigned': {
          const s = data as ShipmentEventData;
          queryClient.invalidateQueries({ queryKey: ['shipments'] });
          queryClient.invalidateQueries({ queryKey: ['shipment', s.id] });
          queryClient.invalidateQueries({ queryKey: ['dispatch'] });
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
          if (toast) {
            toast(`Shipment #${s.id} assigned to driver`, 'success');
          }
          break;
        }

        case 'shipment.unassigned': {
          const s = data as any;
          queryClient.invalidateQueries({ queryKey: ['shipments'] });
          queryClient.invalidateQueries({ queryKey: ['shipment', s?.id] });
          queryClient.invalidateQueries({ queryKey: ['dispatch'] });
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
          if (toast) {
            toast(`Shipment #${s?.id || ''} unassigned`, 'info');
          }
          break;
        }

        case 'dispatch.assigned': {
          const d = data as DispatchEventData;
          queryClient.invalidateQueries({ queryKey: ['dispatch'] });
          queryClient.invalidateQueries({ queryKey: ['shipments'] });
          if (toast) {
            toast(`New assignment for shipment #${d.shipmentId}`, 'info');
          }
          break;
        }

        case 'dispatch.accepted': {
          const d = data as DispatchEventData;
          queryClient.invalidateQueries({ queryKey: ['dispatch'] });
          queryClient.invalidateQueries({ queryKey: ['shipments'] });
          if (toast) {
            toast(`Driver accepted shipment #${d.shipmentId}`, 'success');
          }
          break;
        }

        case 'dispatch.declined': {
          const d = data as DispatchEventData;
          queryClient.invalidateQueries({ queryKey: ['dispatch'] });
          queryClient.invalidateQueries({ queryKey: ['shipments'] });
          if (toast) {
            toast(`Driver declined assignment for shipment #${d.shipmentId}: ${d.reason || 'No reason'}`, 'warning');
          }
          break;
        }

        case 'incident.created':
        case 'incident.updated': {
          const inc = data as IncidentEventData;
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
          queryClient.invalidateQueries({ queryKey: ['roads'] });
          queryClient.invalidateQueries({ queryKey: ['map'] });
          if (toast) {
            toast(`Road incident update: ${inc.title || '#' + inc.id}`, 'warning');
          }
          break;
        }

        case 'road.updated': {
          queryClient.invalidateQueries({ queryKey: ['roads'] });
          queryClient.invalidateQueries({ queryKey: ['map'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;
        }

        case 'alert.created':
        case 'alert.updated': {
          const alt = data as AlertEventData;
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          if (toast && alt?.message) {
            toast(`Alert: ${alt.message}`, 'error');
          }
          break;
        }

        case 'notification.created': {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          if (toast) {
            toast('New notification received', 'info');
          }
          break;
        }

        case 'district.updated': {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['weather'] });
          break;
        }

        case 'emergency.changed': {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['emergency'] });
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          if (toast) {
            toast('Emergency status updated', 'warning');
          }
          break;
        }

        case 'weather.updated': {
          queryClient.invalidateQueries({ queryKey: ['weather'] });
          break;
        }

        default:
          break;
      }
    },
  };
}
