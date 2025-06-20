---
showonlyimage: true
title: Introduction to Istio v1alpha3 Routing API
excerpt: Introduction to the Istio v1alpha3 routing API and its design principles
description: Introduction to the Istio v1alpha3 routing API and its design principles
date: 2018-06-04
author: Lionel.J
image: "/img/2018-06-04-introducing-the-istio-v1alpha3-routing-api/background.jpg"
publishDate: 2018-06-04
tags:
    - Istio 

categories: [ Tech ]
URL: "/2018/06/04/introducing-the-istio-v1alpha3-routing-api/"
---

So far, Istio has provided a simple API for traffic management, which includes four resources: RouteRule, DestinationPolicy, EgressRule, and Ingress (which directly uses Kubernetes' Ingress resource). With this API, users can easily manage traffic within the Istio service mesh. The API allows users to route requests to specific versions of a service, inject delays and failures for resilience testing, add timeouts and circuit breakers, and more—all without having to modify the application code itself.

<!--more-->
Although the current API has proven to be one of Istio's most compelling features, user feedback has also highlighted some shortcomings—especially when managing very large applications with thousands of services or when using protocols other than HTTP. In addition, configuring external traffic using the Kubernetes Ingress resource has been shown to be insufficient for many needs.

To address these and other issues, Istio introduced the new traffic management API v1alpha3, which will completely replace the previous API. While v1alpha3 is fundamentally similar to the earlier model, it is not backward compatible, and models based on the old API will require manual conversion. Istio will provide a migration tool for converting between the old and new models in upcoming releases.

To justify this non-backward-compatible upgrade, the v1alpha3 API underwent a lengthy and rigorous community evaluation process, with the hope that the new API would bring significant improvements and stand the test of time. In this article, we introduce the new configuration model and attempt to explain some of the motivations and design principles behind it.

## Design Principles

Several key design principles were followed during the redesign of the routing model:

* In addition to supporting declarative (intent-based) configuration, the model also allows explicit specification of the underlying infrastructure dependencies. For example, besides configuring the functional features of an ingress gateway, the component (controller) responsible for implementing the ingress gateway can also be specified in the model.
* The model should be "producer-oriented" and "host-centric" when written, rather than composed from multiple separate rules. For example, all rules associated with a specific host are configured together, instead of being configured individually.
* Routing and post-routing behaviors are clearly separated.

## Configuration Resources in v1alpha3

In a typical mesh, there are usually one or more load balancers (referred to as gateways) that terminate external TLS connections and bring traffic into the mesh. Traffic then flows through sidecar gateways to internal services. It is also common for applications to use external services (such as accessing the Google Maps API); in some cases, these external services may be called directly, while in certain deployments, all outbound traffic to external services may be required to pass through a dedicated egress gateway. The diagram below illustrates the use of gateways within the mesh.

![Gateway](/img/2018-06-04-introducing-the-istio-v1alpha3-routing-api/gateways.svg)

Taking these factors into account, `v1alpha3` introduces the following new configuration resources to control traffic routing entering, within, and leaving the mesh.

1. `Gateway`
1. `VirtualService`
1. `DestinationRule`
1. `ServiceEntry`
`VirtualService`, `DestinationRule`, and `ServiceEntry` replace the original API's `RouteRule`, `DestinationPolicy`, and `EgressRule`, respectively. `Gateway` is a platform-independent abstraction used to model traffic flowing into dedicated intermediary devices.

The diagram below illustrates the control flow across multiple configuration resources.
![Relationship between different configuration resources](/img/2018-06-04-introducing-the-istio-v1alpha3-routing-api/virtualservices-destrules.svg)

### Gateway
[Gateway](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#Gateway) is used to configure load balancers for HTTP/TCP traffic, regardless of where the load balancer is running. Any number of Gateways can exist within the mesh, and multiple different Gateway implementations can coexist. In fact, by specifying a set of workload (Pod) labels in the configuration, you can bind a Gateway configuration to specific workloads, allowing users to reuse existing network devices by writing simple Gateway Controllers.

For ingress traffic management, you might ask: why not just use the Kubernetes Ingress API? The reason is that the Ingress API cannot express Istio's routing requirements. Ingress tries to find a common subset among different HTTP proxies, so it only supports the most basic HTTP routing. As a result, advanced features of the proxies have to be added via annotations, which are incompatible and non-portable across different proxies.

Istio `Gateway` overcomes these shortcomings of `Ingress` by separating L4-L6 configuration from L7 configuration. `Gateway` is only used to configure L4-L6 features (such as exposed ports and TLS settings), which are implemented in a unified way by all mainstream L7 proxies. Then, by binding a `VirtualService` to a `Gateway`, you can use standard Istio rules to control HTTP and TCP traffic entering the `Gateway`.

For example, the following simple `Gateway` configures a load balancer to allow external HTTPS traffic for the host bookinfo.com into the mesh:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: bookinfo-gateway
spec:
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - bookinfo.com
    tls:
      mode: SIMPLE
      serverCertificate: /tmp/tls.crt
      privateKey: /tmp/tls.key
```

To configure routing for traffic entering the above Gateway, you must define a `VirtualService` for the same host (described in the next section) and bind it to the previously defined `Gateway` using the `gateways` field in the configuration:
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: bookinfo
spec:
  hosts:
    - bookinfo.com
  gateways:
  - bookinfo-gateway # <---- bind to gateway
  http:
  - match:
    - uri:
        prefix: /reviews
    route:
    ...
```
Gateway can be used to model edge proxies or purely internal proxies, as shown in the first diagram. Regardless of their location, all gateways can be configured and controlled in the same way.
### VirtualService

Replacing routing rules with something called "Virtual services" might seem a bit odd at first, but for what it configures, it's actually a better name—especially after redesigning the API to address the scalability issues of the previous model.

In fact, the change is this: in the previous model, you needed a set of independent configuration rules to set up routing for a specific destination service, and you controlled the order of these rules using the `precedence` field. In the new API, you configure the (virtual) service directly, and all rules for that virtual service are specified as an ordered list within the corresponding [VirtualService](/docs/reference/config/istio.networking.v1alpha3/#VirtualService) resource.

For example, previously in the [Bookinfo](/docs/guides/bookinfo/) application's reviews service, there were two `RouteRule` resources, as shown below:

```yaml
apiVersion: config.istio.io/v1alpha2
kind: RouteRule
metadata:
  name: reviews-default
spec:
  destination:
    name: reviews
  precedence: 1
  route:
  - labels:
      version: v1
---
apiVersion: config.istio.io/v1alpha2
kind: RouteRule
metadata:
  name: reviews-test-v2
spec:
  destination:
    name: reviews
  precedence: 2
  match:
    request:
      headers:
        cookie:
          regex: "^(.*?;)?(user=jason)(;.*)?$"
  route:
  - labels:
      version: v2
```

In `v1alpha3`, you can provide the same configuration within a single `VirtualService` resource:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
  - match:
    - headers:
        cookie:
          regex: "^(.*?;)?(user=jason)(;.*)?$"
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
```
As you can see, the two rules related to the reviews service are now consolidated in one place. At first glance, this change may not seem particularly advantageous. However, a closer look at the new model reveals fundamental differences from the previous API, making v1alpha3 much more powerful.

First, note that the target service for a `VirtualService` is specified using the `hosts` field (which is actually a repeated field), and then referenced again in each route's `destination` field. This is an important distinction from the previous model.

A `VirtualService` describes a mapping between one or more user-addressable destinations and the actual workloads within the mesh. In the example above, these two addresses are the same, but in practice, the user-addressable destination can be any DNS name used to locate a service, with optional wildcard or CIDR prefixes.

This is especially useful during the migration from monolithic to microservices architectures. When a monolithic application is split into multiple independent microservices, a `VirtualService` allows you to continue exposing multiple microservices under the same destination address, so service consumers do not need to change to accommodate the new architecture.

For example, the following rule allows service consumers to access the reviews and ratings services of the Bookinfo application as if they were part of a single (virtual) service at `http://bookinfo.com/`:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: bookinfo
spec:
  hosts:
    - bookinfo.com
  http:
  - match:
    - uri:
        prefix: /reviews
    route:
    - destination:
        host: reviews
  - match:
    - uri:
        prefix: /ratings
    route:
    - destination:
        host: ratings
  ...
```
In fact, the `hosts` section in a `VirtualService` only defines virtual destinations, so they do not necessarily correspond to services already registered in the mesh. This allows users to model traffic for virtual hosts that do not have routable entries within the mesh. By binding a `VirtualService` to a `Gateway` configuration for the same host (as described in the previous section), these hosts can be exposed to external traffic outside the mesh.

In addition to this major refactoring, `VirtualService` introduces several other important changes:

1. Multiple match conditions can be specified within a single `VirtualService` configuration, reducing the need for redundant rule definitions.

1. Each service version has a name (called a service subset). A group of Pods/VMs belonging to a subset is defined in the `DestinationRule`, which will be discussed in the next section.

1. By specifying the host of a `VirtualService` using a DNS wildcard prefix, you can create a single rule that applies to all matching services. For example, in Kubernetes, using `*.foo.svc.cluster.local` as the host in a `VirtualService` allows you to apply the same rewrite rule to all services in the `foo` namespace.

### DestinationRule

[DestinationRule](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#DestinationRule) specifies the set of policies applied when forwarding traffic to a service. These policies are typically authored by the service provider and describe settings such as circuit breakers, load balancing, TLS, and more. Aside from the changes described below, `DestinationRule` is largely similar to its predecessor, `DestinationPolicy`.

1. The `host` field in [DestinationRule](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#DestinationRule) can include a wildcard prefix, allowing a single rule to apply to multiple services.
2. `DestinationRule` defines subsets of the target host (for example, named versions). These subsets are referenced in the routing rules of `VirtualService`, enabling traffic to be directed to specific versions of a service. By naming these versions, you can explicitly reference them in different virtual services, simplify statistics emitted by Istio proxies, and encode subsets into the SNI header.

A `DestinationRule` configuring policies and subsets for the reviews service might look like this:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  trafficPolicy:
    loadBalancer:
      simple: RANDOM
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
  - name: v3
    labels:
      version: v3
```
Note: Unlike `DestinationPolicy`, you can specify multiple policies within a single `DestinationRule` (for example, the default policy and a version-specific policy for v2 as shown above).
### ServiceEntry

[ServiceEntry](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#ServiceEntry) is used to add additional entries to the service registry maintained internally by Istio.
It is most commonly used to model traffic to dependencies outside the mesh, such as APIs on the web or services in legacy infrastructure.

Everything that was previously configured using `EgressRule` can now be easily accomplished with `ServiceEntry`. For example, you can use a configuration like this to allow access from within the mesh to a simple external service:
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: foo-ext
spec:
  hosts:
  - foo.com
  ports:
  - number: 80
    name: http
    protocol: HTTP
```
In other words, `ServiceEntry` offers more functionality than its predecessor. First, `ServiceEntry` is not limited to external service configuration; it can be of two types: internal to the mesh or external to the mesh. An internal mesh entry is simply used to explicitly add a service to the mesh, and the added service is treated like any other internal service. By using internal mesh entries, you can bring previously unmanaged infrastructure into the mesh (for example, adding services running on virtual machines to a Kubernetes-based service mesh). External mesh entries, on the other hand, represent services outside the mesh. For these external services, mTLS authentication is disabled, and policies are enforced on the client side, rather than on the server side as with internal service requests.

Since a `ServiceEntry` configuration simply adds a service to the mesh's internal service registry, it can be used just like any other service in the registry, together with `VirtualService` and/or `DestinationRule`. For example, the following `DestinationRule` can be used to initiate an mTLS connection to an external service:
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: foo-ext
spec:
  name: foo.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/myclientcert.pem
      privateKey: /etc/certs/client_private_key.pem
      caCertificates: /etc/certs/rootcacerts.pem
```
In addition to extending generality, `ServiceEntry` also provides several improvements over `EgressRule`, including:

1. A single `ServiceEntry` can now configure multiple service endpoints, which previously required multiple `EgressRules`.
1. You can now configure the resolution mode for service endpoints (`NONE`, `STATIC`, or `DNS`).
1. Additionally, we are working to address another challenge: currently, secure external services must be accessed via plaintext ports (for example, `http://google.com:443`). This issue will be resolved in the coming weeks, allowing applications to directly access `https://google.com`. Please stay tuned for an upcoming Istio patch release (0.8.x) that will address this limitation.

## Creating and Deleting v1alpha3 Routing Rules
Since all routing rules for a specific destination are now stored as an ordered list within a single `VirtualService` resource, adding a new rule for that destination no longer requires creating a new `RouteRule`. Instead, you update the `VirtualService` resource for that destination.

Old routing rules:
```command
$ istioctl create -f my-second-rule-for-destination-abc.yaml
```
`v1alpha3` routing rules:
```command
$ istioctl replace -f my-updated-rules-for-destination-abc.yaml
```

Deleting routing rules is also done using `istioctl replace`, except when deleting the last routing rule (in which case you need to delete the corresponding `VirtualService`). 

When adding or removing routes that reference service versions, you need to update the `subsets` in the corresponding `DestinationRule` for that service. As you might guess, this is also accomplished using `istioctl replace`.

## Summary
The Istio `v1alpha3` routing API offers more features than its predecessor, but unfortunately, the new API is not backward compatible, and upgrading from the old model requires a one-time manual conversion. After Istio 0.9, the previous configuration resources `RouteRule`, `DestinationPolicy`, and `EgressRule` will no longer be supported. Kubernetes users can continue to use `Ingress` to configure edge load balancers for basic routing. However, advanced routing features (such as traffic splitting between two versions) require the use of `Gateway`, a more powerful and Istio-recommended alternative to `Ingress`.

## Acknowledgments
Thanks to the following people for their contributions to the refactoring and implementation of the new routing model (in alphabetical order):

* Frank Budinsky (IBM)
* Zack Butcher (Google)
* Greg Hanson (IBM)
* Costin Manolache (Google)
* Martin Ostrowski (Google)
* Shriram Rajagopalan (VMware)
* Louis Ryan (Google)
* Isaiah Snell-Feikema (IBM)
* Kuat Yessenov (Google)

## Original Text

* [Introducing the Istio v1alpha3 routing API](https://kubernetes.io/blog/2018/01/extensible-admission-is-beta)
