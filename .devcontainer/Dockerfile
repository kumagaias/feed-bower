# Use the official Node.js image
FROM node:24-bookworm

# Install sudo and create vscode user
RUN apt-get update && apt-get install -y --no-install-recommends sudo \
    && groupadd vscode \
    && useradd -g vscode -s /bin/bash -m vscode \
    && echo vscode ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/vscode \
    && chmod 0440 /etc/sudoers.d/vscode \
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install Go 1.23
ARG GO_VERSION=1.23.2
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates \
    && wget -O go.tar.gz "https://golang.org/dl/go${GO_VERSION}.linux-amd64.tar.gz" \
    && tar -C /usr/local -xzf go.tar.gz \
    && rm go.tar.gz \
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Set Go environment variables
ENV GOROOT=/usr/local/go
ENV GOPATH=/go
ENV PATH=$GOPATH/bin:$GOROOT/bin:$PATH

# Create Go workspace
RUN mkdir -p /go/src /go/bin && chown -R vscode:vscode /go

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        # Development tools
        curl \
        wget \
        git \
        vim \
        jq \
        # Build tools
        build-essential \
        # AWS CLI dependencies
        python3-pip \
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install Terraform
ARG TERRAFORM_VERSION=1.6.2
RUN apt-get update && apt-get install -y --no-install-recommends unzip \
    && wget -O terraform.zip "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" \
    && unzip terraform.zip \
    && mv terraform /usr/local/bin/ \
    && rm terraform.zip \
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install global npm packages as root
RUN npm install -g \
    @aws-amplify/cli \
    typescript \
    ts-node \
    prettier \
    eslint

# Switch to vscode user
USER vscode

# Set up Go environment for vscode user
ENV HOME=/home/vscode
RUN mkdir -p $HOME/go/bin $HOME/go/src $HOME/go/pkg

# Set the default shell to bash
SHELL ["/bin/bash", "-c"]